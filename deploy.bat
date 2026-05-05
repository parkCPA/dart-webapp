@echo off
echo === GitHub + Vercel Deploy Setup ===
echo.
echo [1/4] git init
git init
git add .
git commit -m "init: DART webapp v9"
echo.
echo [2/4] Done. Next steps:
echo   1. Create GitHub repo at https://github.com/new
echo   2. Run: git remote add origin https://github.com/YOUR_ID/dart-webapp.git
echo   3. Run: git push -u origin main
echo   4. Connect repo at https://vercel.com/new
echo   5. Add env vars in Vercel dashboard:
echo      DART_API_KEY  = your DART API key
echo      ANTHROPIC_API_KEY = your Anthropic API key
echo.
pause
