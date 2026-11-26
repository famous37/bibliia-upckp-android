package ua.shlemko.bibliia;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.*;
import android.widget.FrameLayout;
import android.window.OnBackInvokedDispatcher;
import java.io.*;
import java.util.Collections;

public final class ReaderActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private FrameLayout root;
    private WebView reader;
    private boolean handlingBack;

    @Override @SuppressLint("SetJavaScriptEnabled")
    public void onCreate(Bundle state) {
        super.onCreate(state);
        root = new FrameLayout(this);
        reader = new WebView(this);
        root.addView(reader, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        boolean dark = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        applyBars(dark);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, wi) -> {
                Insets safe = wi.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(safe.left,safe.top,safe.right,safe.bottom);
                return WindowInsets.CONSUMED;
            });
            root.requestApplyInsets();
        }
        WebSettings settings = reader.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setTextZoom(Math.round(100 * getResources().getConfiguration().fontScale));
        if (Build.VERSION.SDK_INT >= 33) settings.setAlgorithmicDarkeningAllowed(false);
        reader.setWebViewClient(new LocalEdition());
        reader.addJavascriptInterface(new Actions(), "BibleAndroid");
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::back);
        reader.loadUrl("https://" + HOST + "/reader/index.html");
    }
    @SuppressWarnings("deprecation")
    private void applyBars(boolean dark) {
        int color = Color.parseColor(dark ? "#17201C" : "#FAF8F2");
        root.setBackgroundColor(color);
        reader.setBackgroundColor(color);
        getWindow().setStatusBarColor(color);
        getWindow().setNavigationBarColor(color);
        if (Build.VERSION.SDK_INT >= 29) {
            getWindow().setNavigationBarContrastEnforced(false);
            getWindow().setStatusBarContrastEnforced(false);
        }
        View decor = getWindow().getDecorView();
        int flags = decor.getSystemUiVisibility();
        int mask = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        decor.setSystemUiVisibility(dark ? flags & ~mask : flags | mask);
    }
    private final class LocalEdition extends WebViewClient {
        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return true; }
        @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri url = request.getUrl();
            String path = url.getPath();
            if ("GET".equals(request.getMethod()) && "https".equals(url.getScheme()) && HOST.equals(url.getHost())
                    && path != null && path.startsWith("/reader/") && !path.contains("..")) {
                String mime = path.endsWith(".html") ? "text/html" : path.endsWith(".js") ? "application/javascript" :
                    path.endsWith(".css") ? "text/css" : path.endsWith(".json") ? "application/json" :
                    path.endsWith(".png") ? "image/png" : null;
                if (mime != null) {
                    try {
                        return new WebResourceResponse(mime, path.endsWith(".png") ? null : "utf-8", getAssets().open(path.substring(1)));
                    } catch (IOException ignored) { /* Return a local 404 below. */ }
                }
            }
            return new WebResourceResponse("text/plain","utf-8",404,"Not Found",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
        }
    }
    public final class Actions {
        @JavascriptInterface public void theme(boolean dark) { runOnUiThread(() -> applyBars(dark)); }
        @JavascriptInterface public void copy(String text) {
            runOnUiThread(() -> ((ClipboardManager)getSystemService(Context.CLIPBOARD_SERVICE)).setPrimaryClip(ClipData.newPlainText("Біблія",text)));
        }
        @JavascriptInterface public void share(String text) {
            runOnUiThread(() -> startActivity(Intent.createChooser(new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT,text),"Поділитися уривком")));
        }
    }
    // API 33+ enters through OnBackInvokedDispatcher. Older devices call onBackPressed.
    @Override @SuppressLint("GestureBackNavigation") @SuppressWarnings("deprecation")
    public void onBackPressed() { back(); }
    private void back() {
        if (handlingBack) return;
        handlingBack = true;
        reader.evaluateJavascript("window.readerBack && window.readerBack()", result -> {
            handlingBack = false;
            if (!"true".equals(result) && !isFinishing()) finish();
        });
    }
    @Override protected void onPause() {
        reader.evaluateJavascript("window.savePlace && window.savePlace()",null);
        super.onPause();
    }
    @Override protected void onDestroy() {
        root.removeView(reader); reader.removeJavascriptInterface("BibleAndroid"); reader.destroy(); super.onDestroy();
    }
}
