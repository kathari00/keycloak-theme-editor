package com.keycloaktheme.preview;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import freemarker.cache.FileTemplateLoader;
import freemarker.cache.MultiTemplateLoader;
import freemarker.cache.TemplateLoader;
import freemarker.core.HTMLOutputFormat;
import freemarker.template.Configuration;
import freemarker.template.Template;
import freemarker.template.TemplateExceptionHandler;
import freemarker.template.TemplateMethodModelEx;
import freemarker.template.TemplateModelException;
import java.io.IOException;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.MessageFormat;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public final class PreviewRendererMain {
  private static final Set<String> EXCLUDED_PAGE_TEMPLATES = new LinkedHashSet<String>(
      Arrays.asList("template.ftl", "footer.ftl", "field.ftl", "passkeys.ftl", "cli_splash.ftl")
  );

  public static void main(String[] args) throws Exception {
    Arguments arguments = Arguments.from(args);
    PreviewRenderer renderer = new PreviewRenderer(arguments);
    renderer.render();
  }

  private static final class VariantSpec {
    private final String id;
    private final String baseTheme;
    private final Path overlayDir;

    private VariantSpec(String id, String baseTheme, Path overlayDir) {
      this.id = id;
      this.baseTheme = baseTheme;
      this.overlayDir = overlayDir;
    }
  }

  private static final class Arguments {
    private final Path inputRoot;
    private final Path overrideRoot;
    private final Path presetRoot;
    private final Path outputRoot;
    private final Path contextMocksPath;
    private final Path scenarioManifestRoot;
    private final Path scenarioHtmlRoot;
    private final String keycloakTag;

    private Arguments(
        Path inputRoot,
        Path overrideRoot,
        Path presetRoot,
        Path outputRoot,
        Path contextMocksPath,
        Path scenarioManifestRoot,
        Path scenarioHtmlRoot,
        String keycloakTag
    ) {
      this.inputRoot = inputRoot;
      this.overrideRoot = overrideRoot;
      this.presetRoot = presetRoot;
      this.outputRoot = outputRoot;
      this.contextMocksPath = contextMocksPath;
      this.scenarioManifestRoot = scenarioManifestRoot;
      this.scenarioHtmlRoot = scenarioHtmlRoot;
      this.keycloakTag = keycloakTag;
    }

    private static Arguments from(String[] args) {
      Map<String, String> values = new HashMap<String, String>();
      for (int i = 0; i < args.length; i++) {
        String key = args[i];
        if (!key.startsWith("--")) {
          continue;
        }
        String value = i + 1 < args.length ? args[i + 1] : "";
        if (!value.startsWith("--")) {
          values.put(key.substring(2), value);
          i++;
        }
      }

      Path inputRoot = Paths.get(values.getOrDefault("input", "public/keycloak-upstream"));
      Path overrideRoot = Paths.get(values.getOrDefault("overrides", "public/keycloak-dev-resources/themes"));
      Path presetRoot = Paths.get(values.getOrDefault("presets", "public/keycloak-dev-resources/themes"));
      Path outputRoot = Paths.get(values.getOrDefault("output", "src/features/preview/generated"));
      Path contextMocksPath = Paths.get(values.getOrDefault("context-mocks", "tools/preview-renderer/kc-context-mocks.json"));
      Path scenarioManifestRoot = Paths.get(values.getOrDefault("scenario-stories", "tools/preview-renderer/scenario-stories"));
      Path scenarioHtmlRoot = Paths.get(values.getOrDefault("scenario-html", "tools/preview-renderer/scenario-html"));
      String keycloakTag = values.getOrDefault("tag", "26.x");

      return new Arguments(inputRoot, overrideRoot, presetRoot, outputRoot, contextMocksPath, scenarioManifestRoot, scenarioHtmlRoot, keycloakTag);
    }

  }

  private static final class ContextOverrides {
    private final Map<String, Object> common;
    private final Map<String, Map<String, Object>> pages;

    private ContextOverrides(Map<String, Object> common, Map<String, Map<String, Object>> pages) {
      this.common = common;
      this.pages = pages;
    }
  }

  private static final class ScenarioSpec {
    private final String id;
    private final String htmlFile;

    private ScenarioSpec(
        String id,
        String htmlFile
    ) {
      this.id = id;
      this.htmlFile = htmlFile;
    }
  }

  private static final class PreviewRenderer {
    private static final class VariantInputs {
      private final Path localOverrideLoginDir;
      private final Path baseThemeLoginDir;
      private final Path inheritedBaseLoginDir;
      private final Map<String, String> themeProperties;
      private final Map<String, String> messages;
      private final List<String> pageTemplates;

      private VariantInputs(
          Path localOverrideLoginDir,
          Path baseThemeLoginDir,
          Path inheritedBaseLoginDir,
          Map<String, String> themeProperties,
          Map<String, String> messages,
          List<String> pageTemplates
      ) {
        this.localOverrideLoginDir = localOverrideLoginDir;
        this.baseThemeLoginDir = baseThemeLoginDir;
        this.inheritedBaseLoginDir = inheritedBaseLoginDir;
        this.themeProperties = themeProperties;
        this.messages = messages;
        this.pageTemplates = pageTemplates;
      }
    }

    private static final class VariantRenderResult {
      private final Map<String, String> variantPages;
      private final Map<String, Map<String, String>> variantScenarios;
      private final List<String> skippedTemplates;

      private VariantRenderResult(
          Map<String, String> variantPages,
          Map<String, Map<String, String>> variantScenarios,
          List<String> skippedTemplates
      ) {
        this.variantPages = variantPages;
        this.variantScenarios = variantScenarios;
        this.skippedTemplates = skippedTemplates;
      }
    }

    private final Arguments arguments;
    private final ObjectMapper objectMapper;

    private PreviewRenderer(Arguments arguments) {
      this.arguments = arguments;
      this.objectMapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
    }

    private void render() throws Exception {
      Path resolvedInput = arguments.inputRoot;
      if (!Files.exists(resolvedInput)) {
        throw new IllegalStateException("Input root not found: " + arguments.inputRoot);
      }

      List<VariantSpec> variants = Arrays.asList(
          new VariantSpec("base", "base", null),
          new VariantSpec("v2", "v2", null),
          new VariantSpec("modern-gradient", "base", arguments.presetRoot.resolve("modern-gradient").resolve("login")),
          new VariantSpec("horizontal-card", "base", arguments.presetRoot.resolve("horizontal-card").resolve("login"))
      );

      Map<String, Object> pagesOutput = new LinkedHashMap<String, Object>();
      Map<String, Object> scenariosOutput = new LinkedHashMap<String, Object>();
      ContextOverrides contextOverrides = readContextOverrides(arguments.contextMocksPath);
      Map<String, List<ScenarioSpec>> scenarioSpecsByPage = readScenarioSpecs(arguments.scenarioManifestRoot);

      for (VariantSpec variant : variants) {
        VariantInputs inputs = loadVariantInputs(resolvedInput, variant);
        if (inputs == null) {
          continue;
        }

        VariantRenderResult result = renderVariantPages(variant, inputs, contextOverrides, scenarioSpecsByPage);
        logSkippedTemplates(variant.id, result.skippedTemplates);

        if (!result.variantPages.isEmpty()) {
          pagesOutput.put(variant.id, result.variantPages);
        }
        if (!result.variantScenarios.isEmpty()) {
          scenariosOutput.put(variant.id, result.variantScenarios);
        }
      }

      writeOutputs(pagesOutput, scenariosOutput);
      System.out.println("Generated preview artifacts in " + arguments.outputRoot);
    }

    private VariantInputs loadVariantInputs(Path resolvedInput, VariantSpec variant) throws IOException {
      Path baseThemeLoginDir = resolvedInput.resolve(variant.baseTheme).resolve("login");
      Path localOverrideLoginDir = arguments.overrideRoot.resolve(variant.baseTheme).resolve("login");
      Path inheritedBaseLoginDir = resolvedInput.resolve("base").resolve("login");
      Path messagesPath = resolvedInput.resolve(variant.baseTheme).resolve("messages").resolve("messages_en.properties");
      Path themePropertiesPath = baseThemeLoginDir.resolve("theme.properties");

      if (!Files.exists(baseThemeLoginDir) || !Files.exists(themePropertiesPath) || !Files.exists(messagesPath)) {
        return null;
      }

      Map<String, String> themeProperties = parseJavaProperties(readUtf8(themePropertiesPath));
      Path overrideThemePropertiesPath = localOverrideLoginDir.resolve("theme.properties");
      if (Files.exists(overrideThemePropertiesPath)) {
        Map<String, String> overrideThemeProperties = parseJavaProperties(readUtf8(overrideThemePropertiesPath));
        for (Map.Entry<String, String> entry : overrideThemeProperties.entrySet()) {
          themeProperties.putIfAbsent(entry.getKey(), entry.getValue());
        }
      }

      Map<String, String> messages = parseJavaProperties(readUtf8(messagesPath));
      Path overrideMessagesPath = localOverrideLoginDir.resolve("messages").resolve("messages_en.properties");
      if (Files.exists(overrideMessagesPath)) {
        messages.putAll(parseJavaProperties(readUtf8(overrideMessagesPath)));
      }
      if (variant.overlayDir != null) {
        Path overlayMessagesPath = variant.overlayDir.resolve("messages").resolve("messages_en.properties");
        if (Files.exists(overlayMessagesPath)) {
          messages.putAll(parseJavaProperties(readUtf8(overlayMessagesPath)));
        }
      }

      List<String> pageTemplates = listPageTemplates(baseThemeLoginDir, inheritedBaseLoginDir);

      return new VariantInputs(
          localOverrideLoginDir,
          baseThemeLoginDir,
          inheritedBaseLoginDir,
          themeProperties,
          messages,
          pageTemplates
      );
    }

    private VariantRenderResult renderVariantPages(
        VariantSpec variant,
        VariantInputs inputs,
        ContextOverrides contextOverrides,
        Map<String, List<ScenarioSpec>> scenarioSpecsByPage
    ) {
      Map<String, String> variantPages = new LinkedHashMap<String, String>();
      Map<String, Map<String, String>> variantScenarios = new LinkedHashMap<String, Map<String, String>>();
      List<String> skippedTemplates = new ArrayList<String>();

      for (String pageTemplate : inputs.pageTemplates) {
        String pageId = pageTemplate.replace(".ftl", ".html");
        String pageName = normalizePageName(pageTemplate);
        Map<String, Object> pageContextOverride = buildPageContextOverride(contextOverrides, pageName);
        try {
          String html = renderPage(
              pageTemplate,
              pageId,
              variant,
              inputs,
              pageContextOverride
          );
          if (html.trim().isEmpty()) {
            skippedTemplates.add(pageTemplate + ": renders empty output (macro-only template)");
            continue;
          }
          variantPages.put(pageId, html);

          List<ScenarioSpec> pageScenarios = scenarioSpecsByPage.get(pageName);
          if (pageScenarios != null && !pageScenarios.isEmpty()) {
            Map<String, String> renderedScenarioHtml = new LinkedHashMap<String, String>();
            for (ScenarioSpec scenario : pageScenarios) {
              try {
                renderedScenarioHtml.put(scenario.id, loadScenarioHtml(variant.id, scenario));
              } catch (Exception scenarioError) {
                skippedTemplates.add(
                    pageTemplate + " [" + scenario.id + "]: " + summarizeError(scenarioError)
                        + " (falling back to rendered page HTML)"
                );
                renderedScenarioHtml.put(scenario.id, html);
              }
            }

            if (!renderedScenarioHtml.isEmpty()) {
              variantScenarios.put(pageId, renderedScenarioHtml);
            }
          }
        } catch (Exception error) {
          skippedTemplates.add(pageTemplate + ": " + summarizeError(error));
        }
      }

      return new VariantRenderResult(variantPages, variantScenarios, skippedTemplates);
    }

    private void logSkippedTemplates(String variantId, List<String> skippedTemplates) {
      if (skippedTemplates.isEmpty()) {
        return;
      }

      System.err.println("Skipped " + skippedTemplates.size() + " template(s) for variant " + variantId + " due to unsupported preview context.");
      int sampleCount = Math.min(3, skippedTemplates.size());
      for (int i = 0; i < sampleCount; i++) {
        System.err.println("  - " + skippedTemplates.get(i));
      }
      if (skippedTemplates.size() > sampleCount) {
        System.err.println("  - ... and " + (skippedTemplates.size() - sampleCount) + " more");
      }
    }

    private void writeOutputs(Map<String, Object> pagesOutput, Map<String, Object> scenariosOutput) throws IOException {
      Files.createDirectories(arguments.outputRoot);
      writeJson(arguments.outputRoot.resolve("pages.json"), buildPagesOutputEnvelope(pagesOutput, scenariosOutput));
    }

    private Map<String, Object> buildPagesOutputEnvelope(
        Map<String, Object> pageVariants,
        Map<String, Object> scenarioVariants
    ) {
      Map<String, Object> output = new LinkedHashMap<String, Object>();
      output.put("generatedAt", Instant.now().toString());
      output.put("keycloakTag", arguments.keycloakTag);
      output.put("variants", pageVariants);
      output.put("scenarios", scenarioVariants);
      return output;
    }

    private String renderPage(
        String pageTemplateName,
        String pageId,
        VariantSpec variant,
        VariantInputs inputs,
        Map<String, Object> pageContextOverride
    ) throws Exception {
      Configuration configuration = createConfiguration(variant, inputs);
      Template template = configuration.getTemplate(pageTemplateName);
      Map<String, Object> model = buildModel(
          pageId,
          variant.id,
          inputs.themeProperties,
          inputs.messages,
          pageContextOverride
      );

      StringWriter writer = new StringWriter();
      template.process(model, writer);
      String html = writer.toString();
      return stripEditorMarkers(html);
    }

    private Configuration createConfiguration(
        VariantSpec variant,
        VariantInputs inputs
    ) throws IOException {
      List<TemplateLoader> loaders = new ArrayList<TemplateLoader>();
      if (variant.overlayDir != null && Files.exists(variant.overlayDir)) {
        loaders.add(new FileTemplateLoader(variant.overlayDir.toFile()));
      }
      if (inputs.localOverrideLoginDir != null && Files.exists(inputs.localOverrideLoginDir)) {
        loaders.add(new FileTemplateLoader(inputs.localOverrideLoginDir.toFile()));
      }
      loaders.add(new FileTemplateLoader(inputs.baseThemeLoginDir.toFile()));
      if (Files.exists(inputs.inheritedBaseLoginDir)
          && !inputs.inheritedBaseLoginDir.equals(inputs.baseThemeLoginDir)) {
        loaders.add(new FileTemplateLoader(inputs.inheritedBaseLoginDir.toFile()));
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

    private String summarizeError(Exception error) {
      String message = error.getMessage();
      if (message == null || message.trim().isEmpty()) {
        return error.getClass().getSimpleName();
      }
      String firstLine = message.split("\\R")[0].trim();
      if (firstLine.length() > 180) {
        return firstLine.substring(0, 177) + "...";
      }
      return firstLine;
    }

    private String normalizePageName(String pageTemplateName) {
      String value = pageTemplateName == null ? "" : pageTemplateName.trim();
      if (value.endsWith(".ftl")) {
        value = value.substring(0, value.length() - 4);
      }
      return value;
    }

    private ContextOverrides readContextOverrides(Path path) throws IOException {
      Map<String, Object> emptyCommon = new LinkedHashMap<String, Object>();
      Map<String, Map<String, Object>> emptyPages = new LinkedHashMap<String, Map<String, Object>>();
      if (path == null || !Files.exists(path)) {
        return new ContextOverrides(emptyCommon, emptyPages);
      }

      String json = readUtf8(path);
      if (!json.isEmpty() && json.charAt(0) == '\uFEFF') {
        json = json.substring(1);
      }

      @SuppressWarnings("unchecked")
      Map<String, Object> raw = objectMapper.readValue(json, Map.class);
      Map<String, Object> common = asMap(raw.get("common"));
      Map<String, Map<String, Object>> pages = new LinkedHashMap<String, Map<String, Object>>();
      Map<String, Object> rawPages = asMap(raw.get("pages"));
      for (Map.Entry<String, Object> entry : rawPages.entrySet()) {
        String normalizedPage = normalizePageName(entry.getKey());
        if (normalizedPage.isEmpty()) {
          continue;
        }
        pages.put(normalizedPage, asMap(entry.getValue()));
      }

      return new ContextOverrides(common, pages);
    }

    private Map<String, List<ScenarioSpec>> readScenarioSpecs(Path storiesRoot) throws IOException {
      Map<String, List<ScenarioSpec>> scenariosByPage = new LinkedHashMap<String, List<ScenarioSpec>>();
      if (storiesRoot == null || !Files.exists(storiesRoot)) {
        return scenariosByPage;
      }

      List<Path> storyFiles;
      try (Stream<Path> stream = Files.list(storiesRoot)) {
        storyFiles = stream
            .filter(Files::isRegularFile)
            .filter(path -> path.getFileName().toString().endsWith(".stories.json"))
            .sorted()
            .collect(Collectors.toList());
      }

      for (Path storyFile : storyFiles) {
        String json = readUtf8(storyFile);
        if (!json.isEmpty() && json.charAt(0) == '\uFEFF') {
          json = json.substring(1);
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> rawStoryFile = objectMapper.readValue(json, Map.class);
        String page = normalizePageName(asString(rawStoryFile.get("page")));
        if (page.isEmpty()) {
          throw new IllegalStateException("Scenario stories file is missing \"page\": " + storyFile.toString());
        }

        Object rawStories = rawStoryFile.get("stories");
        if (!(rawStories instanceof List)) {
          throw new IllegalStateException("Scenario stories file must include a \"stories\" array: " + storyFile.toString());
        }

        int scenarioIndex = 0;
        for (Object rawStory : (List<?>) rawStories) {
          scenarioIndex++;
          Map<String, Object> story = asMap(rawStory);
          String id = asString(story.get("id")).trim();
          if (id.isEmpty()) {
            throw new IllegalStateException("Scenario " + scenarioIndex + " in " + storyFile.toString() + " is missing \"id\".");
          }


          String htmlFile = asString(story.get("htmlFile")).trim();
          if (htmlFile.isEmpty()) {
            htmlFile = page + "/" + id + ".html";
          }

          ScenarioSpec spec = new ScenarioSpec(
              id,
              htmlFile
          );

          List<ScenarioSpec> specs = scenariosByPage.get(page);
          if (specs == null) {
            specs = new ArrayList<ScenarioSpec>();
            scenariosByPage.put(page, specs);
          }
          specs.add(spec);
        }
      }

      return scenariosByPage;
    }

    private String loadScenarioHtml(String variantId, ScenarioSpec scenario) throws IOException {
      Path htmlRoot = arguments.scenarioHtmlRoot;
      if (htmlRoot == null) {
        throw new IllegalStateException("Scenario HTML root is not configured.");
      }

      Path resolvedPath = htmlRoot.resolve(variantId).resolve(scenario.htmlFile).normalize();
      if (!Files.exists(resolvedPath) || !Files.isRegularFile(resolvedPath)) {
        throw new IllegalStateException("Missing pre-rendered scenario HTML: " + resolvedPath);
      }

      return readUtf8(resolvedPath);
    }

    private String asString(Object value) {
      return value == null ? "" : String.valueOf(value);
    }

    private Map<String, Object> asMap(Object value) {
      if (!(value instanceof Map)) {
        return new LinkedHashMap<String, Object>();
      }
      @SuppressWarnings("unchecked")
      Map<String, Object> map = (Map<String, Object>) value;
      return new LinkedHashMap<String, Object>(map);
    }

    private Map<String, Object> buildPageContextOverride(ContextOverrides overrides, String pageName) {
      Map<String, Object> merged = deepCopyMap(overrides.common);
      Map<String, Object> pageOverride = overrides.pages.get(pageName);
      if (pageOverride != null && !pageOverride.isEmpty()) {
        deepMergeMap(merged, pageOverride);
      }
      return merged;
    }

    private void deepMergeMap(Map<String, Object> target, Map<String, Object> source) {
      if (source == null || source.isEmpty()) {
        return;
      }

      for (Map.Entry<String, Object> entry : source.entrySet()) {
        String key = entry.getKey();
        Object sourceValue = entry.getValue();
        Object targetValue = target.get(key);

        if (sourceValue instanceof Map && targetValue instanceof Map) {
          @SuppressWarnings("unchecked")
          Map<String, Object> targetChild = (Map<String, Object>) targetValue;
          @SuppressWarnings("unchecked")
          Map<String, Object> sourceChild = (Map<String, Object>) sourceValue;
          deepMergeMap(targetChild, sourceChild);
          continue;
        }

        target.put(key, deepCopyValue(sourceValue));
      }
    }

    private Map<String, Object> deepCopyMap(Map<String, Object> source) {
      Map<String, Object> copy = new LinkedHashMap<String, Object>();
      if (source == null) {
        return copy;
      }

      for (Map.Entry<String, Object> entry : source.entrySet()) {
        copy.put(entry.getKey(), deepCopyValue(entry.getValue()));
      }
      return copy;
    }

    private List<Object> deepCopyList(List<?> source) {
      List<Object> copy = new ArrayList<Object>();
      if (source == null) {
        return copy;
      }

      for (Object item : source) {
        copy.add(deepCopyValue(item));
      }
      return copy;
    }

    @SuppressWarnings("unchecked")
    private Object deepCopyValue(Object value) {
      if (value instanceof Map) {
        return deepCopyMap((Map<String, Object>) value);
      }
      if (value instanceof List) {
        return deepCopyList((List<?>) value);
      }
      return value;
    }

    private String stripEditorMarkers(String html) {
      return html
          .replaceAll("\\sdata-kc-[\\w-]+=(\"[^\"]*\"|'[^']*')", "")
          .replaceAll("\\sdata-editor-[\\w-]+=(\"[^\"]*\"|'[^']*')", "");
    }

    private String resolveVariantResourcesPath(String variantId) {
      return "/keycloak-dev-resources/themes/" + variantId + "/login/resources";
    }

    private List<String> listPageTemplates(Path baseThemeLoginDir, Path inheritedBaseLoginDir) throws IOException {
      Set<String> templates = new LinkedHashSet<String>();
      templates.addAll(collectPageTemplateNames(baseThemeLoginDir));
      templates.addAll(collectPageTemplateNames(inheritedBaseLoginDir));
      if (templates.isEmpty()) {
        return Collections.emptyList();
      }
      return templates.stream().sorted().collect(Collectors.toList());
    }

    private List<String> collectPageTemplateNames(Path loginDir) throws IOException {
      if (loginDir == null || !Files.exists(loginDir)) {
        return Collections.emptyList();
      }

      try (Stream<Path> stream = Files.list(loginDir)) {
        return stream
            .filter(Files::isRegularFile)
            .map(path -> path.getFileName().toString())
            .filter(name -> name.endsWith(".ftl"))
            .filter(name -> !EXCLUDED_PAGE_TEMPLATES.contains(name))
            .collect(Collectors.toList());
      }
    }

    private Map<String, String> parseJavaProperties(String text) {
      Map<String, String> result = new LinkedHashMap<String, String>();
      for (String rawLine : text.split("\\R")) {
        String line = rawLine.trim();
        if (line.isEmpty() || line.startsWith("#")) {
          continue;
        }
        int index = line.indexOf('=');
        if (index <= 0) {
          continue;
        }
        String key = line.substring(0, index).trim();
        String value = line.substring(index + 1).trim();
        result.put(key, value);
      }
      return result;
    }

    private Map<String, Object> buildModel(
        String pageId,
        String variantId,
        Map<String, String> properties,
        Map<String, String> messages,
        Map<String, Object> pageContextOverride
    ) {
      Map<String, Object> model = deepCopyMap(pageContextOverride);
      model.put("properties", properties);
      model.put("msg", new MessageMethod(messages));
      model.put("advancedMsg", new MessageMethod(messages));
      model.put("kcSanitize", new PassthroughMethod());
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
        model.put("messagesPerField", MessagesPerFieldContext.fromMap(rawMessagesPerField));
      } else if (!(messagesPerFieldValue instanceof MessagesPerFieldContext)) {
        model.put("messagesPerField", new MessagesPerFieldContext());
      }

      Object authValue = model.get("auth");
      if (authValue instanceof Map) {
        @SuppressWarnings("unchecked")
        Map<String, Object> rawAuth = (Map<String, Object>) authValue;
        model.put("auth", AuthContext.fromMap(rawAuth));
      } else if (!(authValue instanceof AuthContext)) {
        model.put("auth", new AuthContext());
      }

      Object totpValue = model.get("totp");
      if (totpValue instanceof Map) {
        @SuppressWarnings("unchecked")
        Map<String, Object> rawTotp = (Map<String, Object>) totpValue;
        rawTotp.put("policy", new TotpPolicyContext());
      }

      return model;
    }

    private void writeJson(Path outputPath, Map<String, Object> value) throws IOException {
      Files.createDirectories(outputPath.getParent());
      String json = objectMapper.writeValueAsString(value) + "\n";
      Files.write(outputPath, json.getBytes(StandardCharsets.UTF_8));
    }

    private String readUtf8(Path path) throws IOException {
      return new String(Files.readAllBytes(path), StandardCharsets.UTF_8);
    }
  }

  public static final class MessageMethod implements TemplateMethodModelEx {
    private final Map<String, String> messages;

    public MessageMethod(Map<String, String> messages) {
      this.messages = messages;
    }

    @Override
    public Object exec(@SuppressWarnings("rawtypes") List arguments) throws TemplateModelException {
      if (arguments.isEmpty()) {
        return "";
      }
      String key = String.valueOf(arguments.get(0));
      String pattern = messages.containsKey(key) ? messages.get(key) : key;
      if (arguments.size() == 1) {
        return pattern;
      }
      Object[] values = arguments.subList(1, arguments.size()).stream()
          .map(value -> value == null ? "" : value.toString())
          .toArray();
      return new MessageFormat(pattern, Locale.ENGLISH).format(values);
    }
  }

  public static final class PassthroughMethod implements TemplateMethodModelEx {
    @Override
    public Object exec(@SuppressWarnings("rawtypes") List arguments) {
      return arguments.isEmpty() ? "" : String.valueOf(arguments.get(0));
    }
  }

  public static final class AuthContext {
    private String attemptedUsername = "";
    private Object selectedCredential = null;
    private List<Object> authenticationSelections = Collections.emptyList();
    private boolean showTryAnotherWayLink = false;
    private boolean showUsername = false;
    private boolean showResetCredentials = false;

    public static AuthContext fromMap(Map<String, Object> values) {
      AuthContext context = new AuthContext();
      if (values == null) {
        return context;
      }

      if (values.containsKey("attemptedUsername")) {
        Object value = values.get("attemptedUsername");
        context.attemptedUsername = value == null ? "" : String.valueOf(value);
      }
      if (values.containsKey("selectedCredential")) {
        context.selectedCredential = values.get("selectedCredential");
      }
      if (values.containsKey("showTryAnotherWayLink")) {
        context.showTryAnotherWayLink = context.truthy(values.get("showTryAnotherWayLink"));
      }
      if (values.containsKey("showUsername")) {
        context.showUsername = context.truthy(values.get("showUsername"));
      }
      if (values.containsKey("showResetCredentials")) {
        context.showResetCredentials = context.truthy(values.get("showResetCredentials"));
      }
      if (values.containsKey("authenticationSelections")) {
        Object raw = values.get("authenticationSelections");
        if (raw instanceof List) {
          @SuppressWarnings("unchecked")
          List<Object> list = (List<Object>) raw;
          context.authenticationSelections = list;
        }
      }
      return context;
    }

    private boolean truthy(Object value) {
      if (value instanceof Boolean) {
        return ((Boolean) value).booleanValue();
      }
      return value != null && "true".equalsIgnoreCase(String.valueOf(value));
    }

    public String getAttemptedUsername() {
      return attemptedUsername;
    }

    public Object getSelectedCredential() {
      return selectedCredential;
    }

    public List<Object> getAuthenticationSelections() {
      return authenticationSelections;
    }

    public boolean showTryAnotherWayLink() {
      return showTryAnotherWayLink;
    }

    public boolean showUsername() {
      return showUsername;
    }

    public boolean showResetCredentials() {
      return showResetCredentials;
    }
  }

  public static final class MessagesPerFieldContext {
    private final Map<String, String> fieldErrors;

    public MessagesPerFieldContext() {
      this.fieldErrors = new LinkedHashMap<String, String>();
    }

    public MessagesPerFieldContext(Map<String, String> fieldErrors) {
      this.fieldErrors = fieldErrors == null
          ? new LinkedHashMap<String, String>()
          : new LinkedHashMap<String, String>(fieldErrors);
    }

    public static MessagesPerFieldContext fromMap(Map<String, Object> values) {
      Map<String, String> normalized = new LinkedHashMap<String, String>();
      if (values != null) {
        for (Map.Entry<String, Object> entry : values.entrySet()) {
          if (entry.getValue() == null) {
            continue;
          }
          normalized.put(entry.getKey(), String.valueOf(entry.getValue()));
        }
      }
      return new MessagesPerFieldContext(normalized);
    }

    private String findFirst(String... fieldNames) {
      if (fieldErrors.isEmpty()) {
        return null;
      }

      if (fieldNames == null || fieldNames.length == 0) {
        return fieldErrors.values().iterator().next();
      }

      for (String name : fieldNames) {
        if (name == null) {
          continue;
        }
        String value = fieldErrors.get(name);
        if (value != null && !value.isEmpty()) {
          return value;
        }
      }

      return null;
    }

    public boolean exists(String... fieldNames) {
      return findFirst(fieldNames) != null;
    }

    public boolean existsError(String... fieldNames) {
      return exists(fieldNames);
    }

    public String get(String... fieldNames) {
      String value = findFirst(fieldNames);
      return value == null ? "" : value;
    }

    public String getFirstError(String... fieldNames) {
      return get(fieldNames);
    }

    public String printIfExists(String... fieldNames) {
      return get(fieldNames);
    }
  }

  public static final class TotpPolicyContext {
    public String getAlgorithmKey() { return "HmacSHA1"; }
    public int getDigits() { return 6; }
    public String getType() { return "totp"; }
    public int getPeriod() { return 30; }
    public int getInitialCounter() { return 0; }
  }
}
