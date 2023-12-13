#!/bin/bash

echo "Normal build with SIMD and BlazorWebAssemblyJiterpreter enabled (.Net 8 RC 2 defaults)"
dotnet publish --nologo --configuration Release --output "bin/Publish"

echo "ReleaseCompat build with SIMD and BlazorWebAssemblyJiterpreter disabled"
dotnet publish --nologo --no-restore --configuration ReleaseCompat --output "bin/PublishCompat"

echo "Combine builds"
echo "Copy the 'wwwroot/_framework' folder contents from the 2nd build to 'wwwroot/_frameworkCompat' in the 1st build"
cp -r "bin/PublishCompat/wwwroot/_framework/." "bin/Publish/wwwroot/_frameworkCompat"

echo "If building a PWA app with server-worker-assets.js the service-worker script needs to be modified to also detect SIMD and cache the appropriate build"
echo "Copy the service-worker-assets.js from the 2nd build to 'service-worker-assets-compat.js' of the 1st build"
cp "bin/PublishCompat/wwwroot/service-worker-assets.js" "bin/Publish/wwwroot/service-worker-assets-compat.js"
