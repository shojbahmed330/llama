
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
          # Cleanup and Prep
          rm -rf www android
          mkdir -p www
          
          # Copy app files if they exist, otherwise use fallback
          if [ -d "app" ]; then
            cp -r app/* www/
          elif [ -f "index.html" ]; then
            cp index.html www/
            cp *.js www/ 2>/dev/null || true
            cp *.css www/ 2>/dev/null || true
          else
            echo "<h1>System initializing...</h1>" > www/index.html
          fi

          # Capacitor Setup
          echo '{"appId": "com.oneclick.studio", "appName": "OneClickApp", "webDir": "www", "bundledWebRuntime": false}' > capacitor.config.json
          if [ ! -f package.json ]; then npm init -y; fi
          npm install @capacitor/core@latest @capacitor/cli@latest @capacitor/android@latest
          
          npx cap add android
          
          # Fix Gradle/Java 21 compatibility
          if [ -f "android/app/build.gradle" ]; then
            sed -i 's/JavaVersion.VERSION_17/JavaVersion.VERSION_21/g' android/app/build.gradle
          fi
          
          npx cap copy android
          
          # Signing Logic
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
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
        
      - name: Upload Artifact
        run: |
          mkdir -p public_admin
          if [ -d "admin" ]; then
            cp -r admin/* public_admin/
          else
            echo "<h1>Admin panel not generated for this project.</h1>" > public_admin/index.html
          fi

      - name: Upload Pages Artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: 'public_admin/'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4`;
