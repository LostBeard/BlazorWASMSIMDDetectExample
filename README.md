# Blazor WASM SIMD Detect Example

Blazor Web App SIMD Detect Example  
[BlazorWebAppSIMDDetectExample](https://github.com/LostBeard/BlazorWebAppSIMDDetectExample)

Blazor WebAssembly Standalone SIMD Detect Example (this repo)  
[BlazorWASMSIMDDetectExample](https://github.com/LostBeard/BlazorWASMSIMDDetectExample)

[Live Demo](https://lostbeard.github.io/BlazorWASMSIMDDetectExample/)

If you have done a lot of testing with Blazor WASM you may eventually hit some compatibility issues you weren't expecting. This .Net 8 Blazor WASM project demonstrates a way of detecting SIMD support and using it if available.

# SIMD
[Single Instruction, Multiple Data](https://v8.dev/features/simd) support has been added to Blazor WASM and is now enabled by default in .Net 8, and for good reason. Enabling SIMD brings some large speed improvements in many areas of Blazor WASM. There are many articles that praise the benefits of SIMD. While the linked articles below do not specifically mention Blazor, they all talk about the benefits SIMD can bring to C#.

SIMD and C# articles:    
[LINQ on steroids with SIMD](https://steven-giesel.com/blogPost/faf06188-bae9-484d-804d-a42d58d18cad)  
[SIMD, a parallel processing at hardware level in C#](https://dev.to/mstbardia/simd-a-parallel-processing-at-hardware-level-in-c-42p4)  
[LINQ Internals: Speed Optimizations](https://antao-almada.medium.com/linq-internals-speed-optimizations-1d99b53750bb)  
[Optimizing string.Count all the way from LINQ to hardware accelerated vectorized instructions](https://sergiopedri.medium.com/optimizing-string-count-all-the-way-from-linq-to-hardware-accelerated-vectorized-instructions-186816010ad9)  
[Faster Guid comparisons using Vectors (SIMD) in .NET](https://www.meziantou.net/faster-guid-comparisons-using-vectors-simd-in-dotnet.htm)


## The problem - Inconsistent SIMD support
SIMD WASM support is far from universal and a lack of support kills any Blazor WASM app that requires it before it starts.

A lack of WASM SIMD support can be caused by:
- old browsers. Convincing end users to upgrade for your site is not a great option.
- old hardware. An AMD Phenom 2 X6 has 6 cores and runs at a base speed of 3.2 GHz but no browser running on it can support SIMD because the CPU does not support it. This, and a lot of hardware like it, is still in use and is quite capable.

I also have an updated test phone running Android 9 "Pie" with the latest Firefox 118 and SIMD is not supported. Chrome on the same device supports SIMD. That same version of Firefox on a tablet running Android 11 "Red Velvet Cake" supports SIMD.

So it is obvious that SIMD support is a bit fractured.

Here are 2 options to handle SIMD compatibility issues.
## Option 1 - Disable SIMD support
This is the simplest option and only requires adding the flag ```<WasmEnableSIMD>false</WasmEnableSIMD>``` to your project's .csproj file inside a ```<PropertyGroup>```.  This is the easiest and most compatible way to get around a lack of SIMD support but you lose the ability to take advantage if it is supported.

I also recommend disabling ```BlazorWebAssemblyJiterpreter``` in your compatibility build. Testing on systems that did not support SIMD with SIMD disabled builds would get an exception ```MONO_WASM: get_Cache:0 code generation failed: CompileError: at offset 161: bad type U ...``` and also the message ```MONO_WASM: Disabling jiterpreter after 2 failures```. Setting ```<BlazorWebAssemblyJiterpreter>false</BlazorWebAssemblyJiterpreter>``` fixes it.

## Option 2 - Detect SIMD support and load a supported build (method this project demos)
- Modify your index.html to detect SIMD support and load a compatibility build if needed. 
- Create a compatibility build with SIMD and BlazorWebAssemblyJiterpreter disabled.

### HTML file and Blazor startup
Modify the Blazor startup in the main html file. Depending on the template you used it could be
index.html if a Blazor WebAssembly Standalone app or App.razor in the server project if a Blazor Web App.

The code below will detect SIMD support and use the appropriate build folder.
Modify the html file.
```html
<!-- autostart is set to false so we can detect SIMD support and load the appropriate build -->
<!-- the below script can also be "_framework/blazor.web.js" depending on the hosting model -->
<script src="_framework/blazor.webassembly.js" autostart="false"></script>
<!--
    WASM Feature Detect - from GoogleChromeLabs
    CDN UMD Version: https://unpkg.com/wasm-feature-detect/dist/umd/index.js
    Repo: https://github.com/GoogleChromeLabs/wasm-feature-detect
-->
<script webworker-enabled src="wasm-feature-detect.1.5.1.js"></script>
<!-- 
    The below script tag is used to detect SIMD support on the running device and load the appropriate build 
    If SIMD is not supported it loads _frameworkCompat/ instead of _framework/ 
-->
<script webworker-enabled>
    (async () => {
            var url = new URL(location.href);
            let verboseStart = url.searchParams.get('verboseStart') === '1';
            var forceCompatMode = url.searchParams.get('forceCompatMode') === '1';
            var supportsSimd = await wasmFeatureDetect.simd();
            if (verboseStart) console.log('supportsSimd', supportsSimd);
            // compat mode build could be built without wasm exception support if needed and detected here
            var supportsExceptions = await wasmFeatureDetect.exceptions();
            if (verboseStart) console.log('supportsExceptions', supportsExceptions);
            var useCompatMode = !supportsSimd;
            if (forceCompatMode) {
                if (verboseStart) console.log('forceCompatMode', forceCompatMode);
                useCompatMode = true;
            }
            if (verboseStart) console.log('useCompatMode', useCompatMode);
            // Blazor United (.Net 8 Blazor Web App) Blazor.start settings are slightly different than Blazor WebAssembly (Blazor WebAssembly Standalone App)
            var getRuntimeType = function () {
                for (var script of document.scripts) {
                    if (script.src.indexOf('_framework/blazor.web.js') !== -1) return 'united';
                    if (script.src.indexOf('_framework/blazor.webassembly.js') !== -1) return 'wasm';
                }
                return '';
            }
            var runtimeType = getRuntimeType();
            // customize the resource loader for the runtime that is loaded
            // https://learn.microsoft.com/en-us/aspnet/core/blazor/fundamentals/startup?view=aspnetcore-8.0#load-boot-resources
            var webAssemblyConfig = {
                loadBootResource: function (type, name, defaultUri, integrity) {
                    if (verboseStart) console.log(`Loading: '${type}', '${name}', '${defaultUri}', '${integrity}'`);
                    if (useCompatMode) {
                        let newUrl = defaultUri.replace('_framework/', '_frameworkCompat/');
                        return newUrl;
                    }
                },
            };
            if (runtimeType === 'wasm') {
                // Blazor WebAssembly Standalone App
                Blazor.start(webAssemblyConfig);
            } else if (runtimeType === 'united') {
                // Blazor Web App (formally Blazor United)
                Blazor.start({ webAssembly: webAssemblyConfig });
            }
        })();
</script>
```

### ASP.Net Core Hosted
If using ASP.Net Core hosted Blazor WASM, the server needs to be told to serve the ```.dat``` file type or some files will not be served from _frameworkCompat resulting in ```File not found``` errors in the browser.

In the server project Program.cs file modify the ```app.UseStaticFiles``` call to allow serving .dat files.
```cs
// Enable the .dat file extension (required to serve icudt.dat from _frameworkCompat/
var provider = new FileExtensionContentTypeProvider();
provider.Mappings[".dat"] = "application/octet-stream";
app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = provider
});
```

### Blazor WASM Project Configuration
Add ReleaseCompat configuration rule to the Blazor WASM .csproj file (used during publish)
```xml
<PropertyGroup Condition=" '$(Configuration)' == 'ReleaseCompat' ">
	<WasmEnableSIMD>false</WasmEnableSIMD>
	<BlazorWebAssemblyJiterpreter>false</BlazorWebAssemblyJiterpreter>
</PropertyGroup>
```

### Publish

Example publish.bat to build first with SIMD support, and then without SIMD support for compatibility. This batch script is located in the project folder.
(If using ASP.Net Core hosted Blazor WASM this file would be in the Server's project folder)
```batch
REM Normal build with SIMD and BlazorWebAssemblyJiterpreter enabled (.Net 8 RC 2 defaults)
dotnet publish --nologo --configuration Release --output "bin\Publish"

REM ReleaseCompat build with SIMD and BlazorWebAssemblyJiterpreter disabled
dotnet publish --nologo --no-restore --configuration ReleaseCompat --output "bin\PublishCompat"

REM Combine builds
REM Copy the 'wwwroot\_framework' folder contents from the 2nd build to 'wwwroot\_frameworkCompat' in the 1st build
xcopy /I /E /Y "bin\PublishCompat\wwwroot\_framework" "bin\Publish\wwwroot\_frameworkCompat"
```

Deploy your modified 1st build. Some extra changes, that are not covered here, would be needed for PWAs with service workers and caching. See [Progressive Web Apps](#progressive-web-apps) below for more information about detecting SIMD in PWAs.

Note: The ```webworker-enabled``` attribute on the ```<script>``` tags enables those scripts in [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) when using [SpawnDev.BlazorJS.WebWorkers](https://github.com/LostBeard/SpawnDev.BlazorJS#spawndevblazorjswebworkers).


## Progressive Web Apps
Option 2 above does not work completely with PWAs. Some additional changes are needed to support caching in service workers.

Example modified service-worker.published.js  
```js
// WASM feature detection requires an async call so the code is wrapped in an async function.
(async function () {
    // Caution! Be sure you understand the caveats before publishing an application with
    // offline support. See https://aka.ms/blazor-offline-considerations

    // Use SIMD support detection to decide which build assets to cache
    // Below line is disabled in place of SIMD detection which will determine which assets list to load
    // self.importScripts('./service-worker-assets.js');
    self.importScripts('./wasm-feature-detect.1.5.1.js');
    var supportsSimd = await wasmFeatureDetect.simd();
    var useCompatMode = !supportsSimd;
    var serviceWorkerAssetsFile = useCompatMode ? './service-worker-assets-compat.js' : './service-worker-assets.js';
    self.importScripts(serviceWorkerAssetsFile);
    if (useCompatMode) {
        // update the url of the assets to use _frameworkCompat/ instead of _framework/
        self.assetsManifest.assets.forEach(function(o) {
            if (o.url.startsWith('_framework/')) {
                o.url = o.url.replace('_framework/', '_frameworkCompat/');
            }
        });
    }

   // The code below is standard unmodified service worker code from the Blazor WASM template

    self.addEventListener('install', event => event.waitUntil(onInstall(event)));
    self.addEventListener('activate', event => event.waitUntil(onActivate(event)));
    self.addEventListener('fetch', event => event.respondWith(onFetch(event)));

    const cacheNamePrefix = 'offline-cache-';
    const cacheName = `${cacheNamePrefix}${self.assetsManifest.version}`;
    const offlineAssetsInclude = [/\.dll$/, /\.pdb$/, /\.wasm/, /\.html/, /\.js$/, /\.json$/, /\.css$/, /\.woff$/, /\.png$/, /\.jpe?g$/, /\.gif$/, /\.ico$/, /\.blat$/, /\.dat$/];
    const offlineAssetsExclude = [/^service-worker\.js$/];

    // Replace with your base path if you are hosting on a subfolder. Ensure there is a trailing '/'.
    const base = "/";
    const baseUrl = new URL(base, self.origin);
    const manifestUrlList = self.assetsManifest.assets.map(asset => new URL(asset.url, baseUrl).href);

    async function onInstall(event) {
        console.info('Service worker: Install');
        // Fetch and cache all matching items from the assets manifest
        const assetsRequests = self.assetsManifest.assets
            .filter(asset => offlineAssetsInclude.some(pattern => pattern.test(asset.url)))
            .filter(asset => !offlineAssetsExclude.some(pattern => pattern.test(asset.url)))
            .map(asset => new Request(asset.url, { integrity: asset.hash, cache: 'no-cache' }));
        await caches.open(cacheName).then(cache => cache.addAll(assetsRequests));
    }

    async function onActivate(event) {
        console.info('Service worker: Activate');
        // Delete unused caches
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys
            .filter(key => key.startsWith(cacheNamePrefix) && key !== cacheName)
            .map(key => caches.delete(key)));
    }

    async function onFetch(event) {
        let cachedResponse = null;
        if (event.request.method === 'GET') {
            // For all navigation requests, try to serve index.html from cache,
            // unless that request is for an offline resource.
            // If you need some URLs to be server-rendered, edit the following check to exclude those URLs
            const shouldServeIndexHtml = event.request.mode === 'navigate'
                && !manifestUrlList.some(url => url === event.request.url);

            const request = shouldServeIndexHtml ? 'index.html' : event.request;
            const cache = await caches.open(cacheName);
            cachedResponse = await cache.match(request);
        }
        return cachedResponse || fetch(event.request);
    }
})()
```

Also, one more command is needed in the publish.bat file to copy over the compatibility build's service-worker-assets.js file.

Updated publish.bat  
```batch
REM Normal build with SIMD and BlazorWebAssemblyJiterpreter enabled (.Net 8 RC 2 defaults)
dotnet publish --nologo --configuration Release --output "bin\Publish"

REM ReleaseCompat build with SIMD and BlazorWebAssemblyJiterpreter disabled
dotnet publish --nologo --no-restore --configuration ReleaseCompat --output "bin\PublishCompat"

REM Combine builds
REM Copy the 'wwwroot\_framework' folder contents from the 2nd build to 'wwwroot\_frameworkCompat' in the 1st build
xcopy /I /E /Y "bin\PublishCompat\wwwroot\_framework" "bin\Publish\wwwroot\_frameworkCompat"

REM If building a PWA app with server-worker-assets.js the service-worker script needs to be modified to also detect SIMD and cache the appropriate build
REM Copy the service-worker-assets.js from the 2nd build to 'service-worker-assets-compat.js' of the 1st build
copy /Y "bin\PublishCompat\wwwroot\service-worker-assets.js" "bin\Publish\wwwroot\service-worker-assets-compat.js"
```

