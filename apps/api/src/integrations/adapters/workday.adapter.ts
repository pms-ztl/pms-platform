import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { BaseAdapter } from './base.adapter';

interface WorkdayConfig {
  tenantName: string;
  username: string;
  password: string;
  apiVersion: string;
  baseUrl?: string;
}

interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
  duration: number;
}

interface WorkdayEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string;
  manager: string;
  hireDate: string;
  status: string;
}

@Injectable()
export class WorkdayAdapter extends BaseAdapter {
  private readonly logger = new Logger(WorkdayAdapter.name);
  private client: AxiosInstance;

  constructor(private readonly config: WorkdayConfig) {
    super();
    this.initializeClient();
  }

  /**
   * Initialize Workday API client
   */
  private initializeClient(): void {
    const baseUrl = this.config.baseUrl ||
      `https://wd2-impl-services1.workday.com/ccx/service/${this.config.tenantName}`;

    this.client = axios.create({
      baseURL: baseUrl,
      auth: {
        username: this.config.username,
        password: this.config.password,
      },
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30000,
    });

    this.logger.log(`Initialized Workday adapter for tenant: ${this.config.tenantName}`);
  }

  /**
   * Sync employees from Workday
   */
  async syncEmployees(): Promise<SyncResult> {
    const startTime = new Date();
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      startTime,
      endTime: new Date(),
      duration: 0,
    };

    try {
      this.logger.log('Starting Workday employee sync...');

      // Fetch workers from Workday
      const workers = await this.getWorkers();
      result.recordsProcessed = workers.length;

      // Process each worker
      for (const worker of workers) {
        try {
          const employee = this.transformWorkerToEmployee(worker);
          const existingEmployee = await this.findEmployeeByEmail(employee.email);

          if (existingEmployee) {
            await this.updateEmployee(existingEmployee.id, employee);
            result.recordsUpdated++;
          } else {
            await this.createEmployee(employee);
            result.recordsCreated++;
          }
        } catch (error) {
          result.errors.push(`Failed to process worker ${worker.id}: ${error.message}`);
          result.recordsSkipped++;
        }
      }

      result.success = result.errors.length === 0;
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();

      this.logger.log(
        `Workday employee sync completed: ${result.recordsCreated} created, ${result.recordsUpdated} updated, ${result.recordsSkipped} skipped`,
      );

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Sync failed: ${error.message}`);
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();

      this.logger.error(`Workday employee sync failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Sync organization structure from Workday
   */
  async syncOrganizationStructure(): Promise<SyncResult> {
    const startTime = new Date();
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      startTime,
      endTime: new Date(),
      duration: 0,
    };

    try {
      this.logger.log('Starting Workday organization structure sync...');

      // Fetch organizations from Workday
      const organizations = await this.getOrganizations();
      result.recordsProcessed = organizations.length;

      // Process each organization
      for (const org of organizations) {
        try {
          const department = this.transformOrgToDepartment(org);
          const existingDept = await this.findDepartmentByCode(department.code);

          if (existingDept) {
            await this.updateDepartment(existingDept.id, department);
            result.recordsUpdated++;
          } else {
            await this.createDepartment(department);
            result.recordsCreated++;
          }
        } catch (error) {
          result.errors.push(`Failed to process org ${org.id}: ${error.message}`);
          result.recordsSkipped++;
        }
      }

      result.success = result.errors.length === 0;
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();

      this.logger.log(
        `Workday org structure sync completed: ${result.recordsCreated} created, ${result.recordsUpdated} updated`,
      );

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Sync failed: ${error.message}`);
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();

      this.logger.error(`Workday org structure sync failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Sync job profiles from Workday
   */
  async syncJobProfiles(): Promise<SyncResult> {
    const startTime = new Date();
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      startTime,
      endTime: new Date(),
      duration: 0,
    };

    try {
      this.logger.log('Starting Workday job profiles sync...');

      const jobProfiles = await this.getJobProfiles();
      result.recordsProcessed = jobProfiles.length;

      for (const profile of jobProfiles) {
        try {
          const competencies = this.transformJobProfileToCompetencies(profile);

          for (const competency of competencies) {
            const existing = await this.findCompetencyByCode(competency.code);

            if (existing) {
              await this.updateCompetency(existing.id, competency);
              result.recordsUpdated++;
            } else {
              await this.createCompetency(competency);
              result.recordsCreated++;
            }
          }
        } catch (error) {
          result.errors.push(`Failed to process job profile ${profile.id}: ${error.message}`);
          result.recordsSkipped++;
        }
      }

      result.success = result.errors.length === 0;
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();

      this.logger.log(`Workday job profiles sync completed`);
      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Sync failed: ${error.message}`);
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();

      return result;
    }
  }

  /**
   * Sync compensation data from Workday
   */
  async syncCompensation(): Promise<SyncResult> {
    const startTime = new Date();
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      startTime,
      endTime: new Date(),
      duration: 0,
    };

    try {
      this.logger.log('Starting Workday compensation sync...');

      const compensationData = await this.getCompensationData();
      result.recordsProcessed = compensationData.length;

      for (const comp of compensationData) {
        try {
          const employee = await this.findEmployeeByWorkdayId(comp.workerId);

          if (employee) {
            await this.updateEmployeeCompensation(employee.id, comp);
            result.recordsUpdated++;
          } else {
            result.recordsSkipped++;
          }
        } catch (error) {
          result.errors.push(`Failed to process compensation for ${comp.workerId}: ${error.message}`);
          result.recordsSkipped++;
        }
      }

      result.success = result.errors.length === 0;
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();

      this.logger.log(`Workday compensation sync completed`);
      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Sync failed: ${error.message}`);
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();

      return result;
    }
  }

  /**
   * Fetch workers from Workday API
   */
  private async getWorkers(): Promise<any[]> {
    try {
      const response = await this.client.get(
        `/Human_Resources/${this.config.apiVersion}/Workers`,
        {
          params: {
            limit: 1000,
          },
        },
      );

      return response.data.Report_Entry || [];
    } catch (error) {
      this.logger.error(`Failed to fetch workers from Workday: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch organizations from Workday API
   */
  private async getOrganizations(): Promise<any[]> {
    try {
      const response = await this.client.get(
        `/Human_Resources/${this.config.apiVersion}/Organizations`,
      );

      return response.data.Report_Entry || [];
    } catch (error) {
      this.logger.error(`Failed to fetch organizations from Workday: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch job profiles from Workday API
   */
  private async getJobProfiles(): Promise<any[]> {
    try {
      const response = await this.client.get(
        `/Human_Resources/${this.config.apiVersion}/Job_Profiles`,
      );

      return response.data.Report_Entry || [];
    } catch (error) {
      this.logger.error(`Failed to fetch job profiles from Workday: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch compensation data from Workday API
   */
  private async getCompensationData(): Promise<any[]> {
    try {
      const response = await this.client.get(
        `/Compensation/${this.config.apiVersion}/Worker_Compensation`,
      );

      return response.data.Report_Entry || [];
    } catch (error) {
      this.logger.error(`Failed to fetch compensation data from Workday: ${error.message}`);
      throw error;
    }
  }

  /**
   * Transform Workday worker to PMS employee
   */
  private transformWorkerToEmployee(worker: any): any {
    return {
      externalId: worker.Worker_ID,
      firstName: worker.Legal_First_Name,
      lastName: worker.Legal_Last_Name,
      email: worker.Primary_Work_Email,
      jobTitle: worker.Business_Title,
      department: worker.Cost_Center,
      managerId: worker.Manager_ID,
      hireDate: worker.Hire_Date,
      status: worker.Active_Status === 'Active' ? 'ACTIVE' : 'INACTIVE',
      metadata: {
        source: 'workday',
        syncedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Transform Workday organization to PMS department
   */
  private transformOrgToDepartment(org: any): any {
    return {
      externalId: org.Organization_Reference_ID,
      name: org.Organization_Name,
      code: org.Organization_Code,
      parentId: org.Superior_Organization_Reference_ID,
      metadata: {
        source: 'workday',
        syncedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Transform Workday job profile to PMS competencies
   */
  private transformJobProfileToCompetencies(profile: any): any[] {
    const competencies = profile.Required_Competencies || [];

    return competencies.map((comp: any) => ({
      externalId: comp.Competency_ID,
      name: comp.Competency_Name,
      code: comp.Competency_Code,
      category: comp.Competency_Type,
      level: comp.Required_Level,
      description: comp.Description,
      metadata: {
        source: 'workday',
        syncedAt: new Date().toISOString(),
      },
    }));
  }

  /**
   * Placeholder methods for database operations
   * In production, these would use PrismaService
   */
  private async findEmployeeByEmail(email: string): Promise<any | null> {
    return null;
  }

  private async findEmployeeByWorkdayId(workdayId: string): Promise<any | null> {
    return null;
  }

  private async createEmployee(employee: any): Promise<any> {
    this.logger.debug(`Would create employee: ${employee.email}`);
    return employee;
  }

  private async updateEmployee(id: string, employee: any): Promise<any> {
    this.logger.debug(`Would update employee: ${id}`);
    return employee;
  }

  private async updateEmployeeCompensation(id: string, comp: any): Promise<void> {
    this.logger.debug(`Would update compensation for employee: ${id}`);
  }

  private async findDepartmentByCode(code: string): Promise<any | null> {
    return null;
  }

  private async createDepartment(department: any): Promise<any> {
    this.logger.debug(`Would create department: ${department.name}`);
    return department;
  }

  private async updateDepartment(id: string, department: any): Promise<any> {
    this.logger.debug(`Would update department: ${id}`);
    return department;
  }

  private async findCompetencyByCode(code: string): Promise<any | null> {
    return null;
  }

  private async createCompetency(competency: any): Promise<any> {
    this.logger.debug(`Would create competency: ${competency.name}`);
    return competency;
  }

  private async updateCompetency(id: string, competency: any): Promise<any> {
    this.logger.debug(`Would update competency: ${id}`);
    return competency;
  }
}
