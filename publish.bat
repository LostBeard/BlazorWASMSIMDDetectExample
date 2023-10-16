echo Normal build with SIMD and BlazorWebAssemblyJiterpreter enabled (.Net 8 RC 2 defaults)
dotnet publish --nologo --configuration Release --output "bin\Publish"

echo Compatibility build with SIMD and BlazorWebAssemblyJiterpreter disabled
dotnet publish --nologo --no-restore --configuration Release -p:WasmEnableSIMD=false -p:BlazorWebAssemblyJiterpreter=false --output "bin\PublishCompat"

echo Combine builds
echo Copy the 'wwwroot\_framework' folder contents from the 2nd build to 'wwwroot\_frameworkCompat' in the 1st build
xcopy /I /E /Y "bin\PublishCompat\wwwroot\_framework" "bin\Publish\wwwroot\_frameworkCompat"

echo If building a PWA app with server-worker-assets.js the service-worker script needs to be modified to also detect SIMD and cache the appropriate build
echo Copy the service-worker-assets.js from the 2nd build to 'service-worker-assets-compat.js' of the 1st build
copy /Y "bin\PublishCompat\wwwroot\service-worker-assets.js" "bin\Publish\wwwroot\service-worker-assets-compat.js"

