@echo off
echo ========================================
echo PMS PLATFORM - STARTUP GUIDE
echo ========================================
echo.
echo ✅ Setup completed successfully!
echo ✅ Database seeded with demo data
echo.
echo To start the application, you need TWO terminals:
echo.
echo ========================================
echo TERMINAL 1: Backend API
echo ========================================
echo.
echo Copy and run this command in a NEW terminal:
echo.
echo     cd D:\CDC\PMS\pms-platform\apps\api ^&^& npm run dev
echo.
echo Wait for: "Server started on port 3001"
echo.
echo ========================================
echo TERMINAL 2: Frontend
echo ========================================
echo.
echo Copy and run this command in ANOTHER NEW terminal:
echo.
echo     cd D:\CDC\PMS\pms-platform\apps\web ^&^& npm run dev
echo.
echo Wait for: "Local: http://localhost:3002/"
echo.
echo ========================================
echo THEN: Open Your Browser
echo ========================================
echo.
echo URL:      http://localhost:3002
echo Email:    admin@demo.pms-platform.local
echo Password: demo123
echo.
echo ========================================
echo Other Demo Users:
echo ========================================
echo Manager:  manager@demo.pms-platform.local / demo123
echo Employee: employee@demo.pms-platform.local / demo123
echo Designer: jane@demo.pms-platform.local / demo123
echo.
echo ========================================
echo Need Help?
echo ========================================
echo - Full instructions: SETUP_COMPLETE.md
echo - Troubleshooting: TROUBLESHOOTING.md
echo - Quick start: QUICKSTART.md
echo - Diagnostics: diagnose.bat
echo.
pause
