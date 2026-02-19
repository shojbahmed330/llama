
export const WORKFLOW_YAML = `name: Build Android APK & Deploy Web
on:
  push:
    branches: [ main ]
  workflow_dispatch:

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: write
  pages: write
  id-token: write

jobs:
  build-apk:
    name: Build Android Binary
    runs-on: ubuntu-latest
    env:
      SIGNING_STORE_PASSWORD: ""
      SIGNING_KEY_ALIAS: ""
      SIGNING_KEY_PASSWORD: ""
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
      
      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Initialize and Build
        run: |
          # 1. Cleanup and Prepare Directory
          rm -rf www android
          mkdir -p www
          
          # 2. MANDATORY: Create a placeholder index.html to satisfy Capacitor immediately
          echo '<!DOCTYPE html><html><head><title>Booting</title></head><body style="background:#000;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;"><h1>Initializing System...</h1></body></html>' > www/index.html
          
          # 3. Detect and Copy Source Files
          echo "Syncing source files..."
          if [ -d "app" ]; then
            cp -r app/* www/ 2>/dev/null || true
          fi
          if [ -f "index.html" ]; then
            cp index.html www/ 2>/dev/null || true
          fi
          
          # Ensure index.html is actually there after copy
          if [ ! -f "www/index.html" ]; then
             echo "<h1>Critical Error: Entry point missing. Recovering...</h1>" > www/index.html
          fi

          # 4. Capacitor Config Setup
          echo '{"appId": "com.oneclick.studio", "appName": "OneClickApp", "webDir": "www", "bundledWebRuntime": false}' > capacitor.config.json
          if [ ! -f package.json ]; then npm init -y; fi
          npm install @capacitor/core@latest @capacitor/cli@latest @capacitor/android@latest
          
          # 5. Native Project Generation
          npx cap add android
          
          # Fix Gradle/Java 21 compatibility in build.gradle
          if [ -f "android/app/build.gradle" ]; then
            sed -i 's/JavaVersion.VERSION_17/JavaVersion.VERSION_21/g' android/app/build.gradle
          fi
          
          # 6. Final Sync
          npx cap sync android
          
          # 7. Production Build
          if [ -f android/app/release-key.jks ]; then
            echo "Production Keystore Found. Executing Signed Build..."
            cd android && chmod +x gradlew
            ./gradlew assembleRelease \\
              -Pandroid.injected.signing.store.file=release-key.jks \\
              -Pandroid.injected.signing.store.password=\${{ env.SIGNING_STORE_PASSWORD }} \\
              -Pandroid.injected.signing.key.alias=\${{ env.SIGNING_KEY_ALIAS }} \\
              -Pandroid.injected.signing.key.password=\${{ env.SIGNING_KEY_PASSWORD }}
          else
            echo "Using Debug Mode (Unsigned)..."
            cd android && chmod +x gradlew && ./gradlew assembleDebug
          fi

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: \${{ hashFiles('android/app/release-key.jks') != '' && 'app-release' || 'app-debug' }}
          path: android/app/build/outputs/apk/**/*.apk

  deploy-admin:
    name: Deploy Admin Panel
    runs-on: ubuntu-latest
    needs: build-apk
    continue-on-error: true # Prevents the whole workflow from failing if Pages is not active
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Pages
        id: pages_setup
        uses: actions/configure-pages@v4
        continue-on-error: true
        
      - name: Prepare Artifact
        run: |
          mkdir -p public_admin
          if [ -d "admin" ] && [ -f "admin/index.html" ]; then
            echo "Admin source found. Packaging..."
            cp -r admin/* public_admin/
          else
            echo "<h1>Admin node not found. This project might only contain a mobile app.</h1>" > public_admin/index.html
          fi

      - name: Upload Pages Artifact
        uses: actions/upload-pages-artifact@v3
        if: steps.pages_setup.outcome == 'success'
        with:
          path: 'public_admin/'

      - name: Deploy to GitHub Pages
        id: deployment
        if: steps.pages_setup.outcome == 'success'
        uses: actions/deploy-pages@v4`;
