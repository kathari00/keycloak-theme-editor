package com.keycloaktheme.preview;

import freemarker.cache.FileTemplateLoader;
import freemarker.cache.MultiTemplateLoader;
import freemarker.cache.TemplateLoader;
import freemarker.core.HTMLOutputFormat;
import freemarker.template.Configuration;
import freemarker.template.Template;
import freemarker.template.TemplateExceptionHandler;
import java.io.IOException;
import java.io.StringWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class PageRenderer {
  private static final Pattern BODY_TAG_PATTERN = Pattern.compile(
      "(<body\\b)([^>]*)(>)", Pattern.CASE_INSENSITIVE
  );
  private static final Pattern DATA_PAGE_ID_ATTR = Pattern.compile(
      "\\sdata-page-id\\s*=\\s*(['\"])[^'\"]*\\1", Pattern.CASE_INSENSITIVE
  );

  private final ContextBuilder contextBuilder;

  public PageRenderer(ContextBuilder contextBuilder) {
    this.contextBuilder = contextBuilder;
  }

  public String renderPage(
      String pageTemplateName,
      String pageId,
      String variantId,
      Path overlayDir,
      Path userOverlayDir,
      VariantLoader.VariantInputs inputs,
      Map<String, Object> pageContextOverride
  ) throws Exception {
    Configuration configuration = createConfiguration(overlayDir, userOverlayDir, inputs);
    Template template = configuration.getTemplate(pageTemplateName);
    Map<String, Object> model = buildModel(
        pageId,
        variantId,
        inputs.getThemeProperties(),
        inputs.getMessages(),
        pageContextOverride
    );

    StringWriter writer = new StringWriter();
    template.process(model, writer);
    String html = writer.toString();
    html = stripEditorMarkers(html);
    html = ensureDataPageId(html, pageId);
    return html;
  }

  private Configuration createConfiguration(Path overlayDir, Path userOverlayDir, VariantLoader.VariantInputs inputs) throws IOException {
    List<TemplateLoader> loaders = new ArrayList<TemplateLoader>();
    if (userOverlayDir != null && Files.exists(userOverlayDir)) {
      loaders.add(new FileTemplateLoader(userOverlayDir.toFile()));
    }
    if (overlayDir != null && Files.exists(overlayDir)) {
      loaders.add(new FileTemplateLoader(overlayDir.toFile()));
    }
    if (inputs.getLocalOverrideLoginDir() != null && Files.exists(inputs.getLocalOverrideLoginDir())) {
      loaders.add(new FileTemplateLoader(inputs.getLocalOverrideLoginDir().toFile()));
    }
    loaders.add(new FileTemplateLoader(inputs.getBaseThemeLoginDir().toFile()));
    if (Files.exists(inputs.getInheritedBaseLoginDir())
        && !inputs.getInheritedBaseLoginDir().equals(inputs.getBaseThemeLoginDir())) {
      loaders.add(new FileTemplateLoader(inputs.getInheritedBaseLoginDir().toFile()));
    }

    Configuration configuration = new Configuration(Configuration.VERSION_2_3_32);
    configuration.setTemplateLoader(new MultiTemplateLoader(loaders.toArray(new TemplateLoader[0])));
    configuration.setDefaultEncoding("UTF-8");
    configuration.setTemplateExceptionHandler(TemplateExceptionHandler.RETHROW_HANDLER);
    configuration.setLogTemplateExceptions(false);
    configuration.setWrapUncheckedExceptions(true);
    configuration.setClassicCompatible(true);
    configuration.setOutputFormat(HTMLOutputFormat.INSTANCE);
    return configuration;
  }

  private Map<String, Object> buildModel(
      String pageId,
      String variantId,
      Map<String, String> properties,
      Map<String, String> messages,
      Map<String, Object> pageContextOverride
  ) {
    Map<String, Object> model = contextBuilder.deepCopyMap(pageContextOverride);
    model.put("properties", properties);
    model.put("msg", new ContextObjects.MessageMethod(messages));
    model.put("advancedMsg", new ContextObjects.MessageMethod(messages));
    model.put("kcSanitize", new ContextObjects.PassthroughMethod());
    model.put("pageId", pageId.replace(".html", ""));

    Object urlValue = model.get("url");
    if (urlValue instanceof Map) {
      @SuppressWarnings("unchecked")
      Map<String, Object> rawUrl = (Map<String, Object>) urlValue;
      rawUrl.put("resourcesPath", resolveVariantResourcesPath(variantId));
    }

    Object messagesPerFieldValue = model.get("messagesPerField");
    if (messagesPerFieldValue instanceof Map) {
      @SuppressWarnings("unchecked")
      Map<String, Object> rawMessagesPerField = (Map<String, Object>) messagesPerFieldValue;
      model.put("messagesPerField", ContextObjects.MessagesPerFieldContext.fromMap(rawMessagesPerField));
    } else if (!(messagesPerFieldValue instanceof ContextObjects.MessagesPerFieldContext)) {
      model.put("messagesPerField", new ContextObjects.MessagesPerFieldContext());
    }

    Object authValue = model.get("auth");
    if (authValue instanceof Map) {
      @SuppressWarnings("unchecked")
      Map<String, Object> rawAuth = (Map<String, Object>) authValue;
      model.put("auth", ContextObjects.AuthContext.fromMap(rawAuth));
    } else if (!(authValue instanceof ContextObjects.AuthContext)) {
      model.put("auth", new ContextObjects.AuthContext());
    }

    Object totpValue = model.get("totp");
    if (totpValue instanceof Map) {
      @SuppressWarnings("unchecked")
      Map<String, Object> rawTotp = (Map<String, Object>) totpValue;
      rawTotp.put("policy", new ContextObjects.TotpPolicyContext());
    }

    return model;
  }

  private String ensureDataPageId(String html, String pageId) {
    String expectedId = "login-" + pageId.replaceAll("\\.html$", "");
    Matcher bodyMatcher = BODY_TAG_PATTERN.matcher(html);
    if (!bodyMatcher.find()) {
      return html;
    }
    String attrs = bodyMatcher.group(2);
    // Strip any existing data-page-id attribute
    String cleanedAttrs = DATA_PAGE_ID_ATTR.matcher(attrs).replaceAll("");
    String replacement = bodyMatcher.group(1) + cleanedAttrs + " data-page-id=\"" + expectedId + "\"" + bodyMatcher.group(3);
    return bodyMatcher.replaceFirst(Matcher.quoteReplacement(replacement));
  }

  private String stripEditorMarkers(String html) {
    return html
        .replaceAll("\\sdata-kc-[\\w-]+=(\"[^\"]*\"|'[^']*')", "")
        .replaceAll("\\sdata-editor-[\\w-]+=(\"[^\"]*\"|'[^']*')", "");
  }

  private String resolveVariantResourcesPath(String variantId) {
    return "/keycloak-dev-resources/themes/" + variantId + "/login/resources";
  }
}
