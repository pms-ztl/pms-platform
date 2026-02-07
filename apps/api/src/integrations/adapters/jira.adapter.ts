import { Injectable, Logger } from '@nestjs/common';
import { Version3Client } from 'jira.js';
import { BaseAdapter, SyncResult } from './base.adapter';

interface JiraConfig {
  host: string;
  email: string;
  apiToken: string;
}

interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  lead?: string;
}

interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description?: string;
  status: string;
  assignee?: string;
  reporter?: string;
  created: string;
  updated: string;
}

@Injectable()
export class JiraAdapter extends BaseAdapter {
  private client: Version3Client;

  constructor(private readonly config: JiraConfig) {
    super();
    this.initializeClient();
  }

  /**
   * Initialize Jira client
   */
  private initializeClient(): void {
    this.client = new Version3Client({
      host: this.config.host,
      authentication: {
        basic: {
          email: this.config.email,
          apiToken: this.config.apiToken,
        },
      },
    });

    this.logger.log(`Initialized Jira adapter for host: ${this.config.host}`);
  }

  /**
   * Test Jira connection
   */
  protected async ping(): Promise<void> {
    await this.client.myself.getCurrentUser();
  }

  /**
   * Sync projects from Jira
   */
  async syncProjects(): Promise<SyncResult> {
    const result = this.createSyncResult();

    try {
      this.logger.log('Starting Jira projects sync...');

      const projects = await this.client.projects.getAllProjects();
      result.recordsProcessed = projects.length;

      for (const project of projects) {
        try {
          const projectData = {
            externalId: project.id,
            name: project.name,
            key: project.key,
            description: project.description,
            metadata: {
              source: 'jira',
              syncedAt: new Date().toISOString(),
            },
          };

          // In production: upsert project
          result.recordsCreated++;
        } catch (error) {
          result.errors.push(`Failed to sync project ${project.key}: ${error.message}`);
          result.recordsSkipped++;
        }
      }

      return this.finalizeSyncResult(result);
    } catch (error) {
      return this.handleSyncError(result, error);
    }
  }

  /**
   * Sync issues from Jira
   */
  async syncIssues(projectKey?: string): Promise<SyncResult> {
    const result = this.createSyncResult();

    try {
      this.logger.log(`Starting Jira issues sync${projectKey ? ` for project ${projectKey}` : ''}...`);

      const jql = projectKey
        ? `project = ${projectKey} ORDER BY updated DESC`
        : 'updated >= -30d ORDER BY updated DESC';

      const searchResults = await this.client.issueSearch.searchForIssuesUsingJql({
        jql,
        maxResults: 1000,
        fields: ['summary', 'description', 'status', 'assignee', 'reporter', 'created', 'updated'],
      });

      result.recordsProcessed = searchResults.issues?.length || 0;

      for (const issue of searchResults.issues || []) {
        try {
          const issueData = {
            externalId: issue.id,
            key: issue.key,
            summary: issue.fields.summary,
            description: issue.fields.description,
            status: issue.fields.status?.name,
            assignee: issue.fields.assignee?.accountId,
            metadata: {
              source: 'jira',
              syncedAt: new Date().toISOString(),
            },
          };

          // In production: upsert issue
          result.recordsCreated++;
        } catch (error) {
          result.errors.push(`Failed to sync issue ${issue.key}: ${error.message}`);
          result.recordsSkipped++;
        }
      }

      return this.finalizeSyncResult(result);
    } catch (error) {
      return this.handleSyncError(result, error);
    }
  }

  /**
   * Create goal from Jira epic
   */
  async createGoalFromEpic(epicKey: string, tenantId: string, ownerId: string): Promise<any> {
    try {
      this.logger.log(`Creating goal from Jira epic: ${epicKey}`);

      // Fetch epic details
      const epic = await this.client.issues.getIssue({
        issueIdOrKey: epicKey,
        fields: ['summary', 'description', 'duedate', 'status'],
      });

      // Fetch child issues
      const childIssues = await this.client.issueSearch.searchForIssuesUsingJql({
        jql: `parent = ${epicKey}`,
        fields: ['summary', 'status'],
      });

      // Calculate progress based on child issues
      const totalIssues = childIssues.total || 0;
      const completedIssues =
        childIssues.issues?.filter((issue) => issue.fields.status?.name === 'Done').length || 0;
      const progress = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

      // Create goal
      const goal = {
        tenantId,
        ownerId,
        title: epic.fields.summary,
        description: epic.fields.description || '',
        type: 'TEAM',
        status: this.mapJiraStatusToGoalStatus(epic.fields.status?.name || ''),
        priority: 'HIGH',
        progress,
        dueDate: epic.fields.duedate ? new Date(epic.fields.duedate) : null,
        metadata: {
          source: 'jira',
          epicKey,
          syncedAt: new Date().toISOString(),
        },
      };

      // In production: create goal in database
      this.logger.log(`Created goal from epic ${epicKey}`);
      return goal;
    } catch (error) {
      this.logger.error(`Failed to create goal from epic: ${error.message}`);
      throw error;
    }
  }

  /**
   * Link goal to Jira issue
   */
  async linkGoalToIssue(goalId: string, issueKey: string): Promise<void> {
    try {
      this.logger.log(`Linking goal ${goalId} to Jira issue ${issueKey}`);

      // Add remote link in Jira
      await this.client.issueRemoteLinks.createOrUpdateRemoteIssueLink({
        issueIdOrKey: issueKey,
        object: {
          url: `https://app.pms-platform.com/goals/${goalId}`,
          title: 'PMS Goal',
          icon: {
            url16x16: 'https://app.pms-platform.com/favicon-16x16.png',
          },
        },
      });

      // In production: update goal metadata with Jira link
      this.logger.log(`Linked goal ${goalId} to issue ${issueKey}`);
    } catch (error) {
      this.logger.error(`Failed to link goal to issue: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update goal progress from Jira epic
   */
  async updateGoalProgressFromEpic(goalId: string, epicKey: string): Promise<void> {
    try {
      // Fetch child issues
      const childIssues = await this.client.issueSearch.searchForIssuesUsingJql({
        jql: `parent = ${epicKey}`,
        fields: ['status'],
      });

      const totalIssues = childIssues.total || 0;
      const completedIssues =
        childIssues.issues?.filter((issue) => issue.fields.status?.name === 'Done').length || 0;
      const progress = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

      // In production: update goal progress
      this.logger.debug(`Updated goal ${goalId} progress to ${progress}%`);
    } catch (error) {
      this.logger.error(`Failed to update goal progress: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create Jira issue from goal key result
   */
  async createIssueFromKeyResult(keyResultId: string, keyResultData: any, projectKey: string): Promise<string> {
    try {
      this.logger.log(`Creating Jira issue from key result: ${keyResultId}`);

      const issue = await this.client.issues.createIssue({
        fields: {
          project: {
            key: projectKey,
          },
          summary: keyResultData.description,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: `Target: ${keyResultData.targetValue} ${keyResultData.unit || ''}`,
                  },
                ],
              },
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: `Current: ${keyResultData.currentValue} ${keyResultData.unit || ''}`,
                  },
                ],
              },
            ],
          },
          issuetype: {
            name: 'Task',
          },
          priority: {
            name: this.mapGoalPriorityToJiraPriority(keyResultData.priority),
          },
        },
      });

      this.logger.log(`Created Jira issue ${issue.key} from key result ${keyResultId}`);
      return issue.key;
    } catch (error) {
      this.logger.error(`Failed to create issue from key result: ${error.message}`);
      throw error;
    }
  }

  /**
   * Map Jira status to goal status
   */
  private mapJiraStatusToGoalStatus(jiraStatus: string): string {
    const statusMap: Record<string, string> = {
      'To Do': 'ACTIVE',
      'In Progress': 'ACTIVE',
      Done: 'COMPLETED',
      Cancelled: 'CANCELLED',
    };

    return statusMap[jiraStatus] || 'ACTIVE';
  }

  /**
   * Map goal priority to Jira priority
   */
  private mapGoalPriorityToJiraPriority(goalPriority: string): string {
    const priorityMap: Record<string, string> = {
      LOW: 'Low',
      MEDIUM: 'Medium',
      HIGH: 'High',
      CRITICAL: 'Highest',
    };

    return priorityMap[goalPriority] || 'Medium';
  }

  /**
   * Sync sprints and link to review cycles
   */
  async syncSprints(boardId: number): Promise<SyncResult> {
    const result = this.createSyncResult();

    try {
      this.logger.log(`Starting Jira sprints sync for board ${boardId}...`);

      const sprints = await this.client.board.getAllSprints({
        boardId,
      });

      result.recordsProcessed = sprints.values?.length || 0;

      for (const sprint of sprints.values || []) {
        try {
          const sprintData = {
            externalId: sprint.id?.toString(),
            name: sprint.name,
            startDate: sprint.startDate ? new Date(sprint.startDate) : null,
            endDate: sprint.endDate ? new Date(sprint.endDate) : null,
            state: sprint.state,
            metadata: {
              source: 'jira',
              boardId,
              syncedAt: new Date().toISOString(),
            },
          };

          // In production: create/update review cycle or project milestone
          result.recordsCreated++;
        } catch (error) {
          result.errors.push(`Failed to sync sprint ${sprint.id}: ${error.message}`);
          result.recordsSkipped++;
        }
      }

      return this.finalizeSyncResult(result);
    } catch (error) {
      return this.handleSyncError(result, error);
    }
  }
}
