package com.keycloaktheme.preview;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class PreviewRendererMain {
  private final Arguments arguments;
  private final ObjectMapper objectMapper;
  private final ContextBuilder contextBuilder;
  private final VariantLoader variantLoader;
  private final PageRenderer pageRenderer;

  private PreviewRendererMain(Arguments arguments) {
    this.arguments = arguments;
    this.objectMapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
    this.contextBuilder = new ContextBuilder(objectMapper);
    this.variantLoader = new VariantLoader(arguments.overrideRoot);
    this.pageRenderer = new PageRenderer(contextBuilder);
  }

  public static void main(String[] args) throws Exception {
    Arguments arguments = Arguments.from(args);
    PreviewRendererMain renderer = new PreviewRendererMain(arguments);
    renderer.render();
  }

  private void render() throws Exception {
    if (!Files.exists(arguments.inputRoot)) {
      throw new IllegalStateException("Input root not found: " + arguments.inputRoot);
    }

    Map<String, Object> pagesOutput = new LinkedHashMap<String, Object>();

    ContextBuilder.ContextOverrides contextOverrides = contextBuilder.readContextOverrides(arguments.contextMocksPath);

    for (VariantSpec variant : getVariants()) {
      VariantLoader.VariantInputs inputs = variantLoader.loadVariantInputs(
          arguments.inputRoot,
          variant.baseTheme,
          variant.overlayDir,
          variant.userOverlayDir
      );
      if (inputs == null) {
        continue;
      }

      VariantRenderResult result = renderVariantPages(variant, inputs, contextOverrides);
      logSkippedTemplates(variant.id, result.skippedTemplates);

      if (!result.variantPages.isEmpty()) {
        pagesOutput.put(variant.id, result.variantPages);
      }
    }

    writeOutputs(pagesOutput);
    System.out.println("Generated preview artifacts in " + arguments.outputRoot);
  }

  private List<VariantSpec> getVariants() throws IOException {
    List<VariantSpec> variants = new ArrayList<VariantSpec>(Arrays.asList(
        new VariantSpec("base", "base", null, null),
        new VariantSpec("v2", "v2", null, null),
        new VariantSpec("modern-gradient", "base", arguments.presetRoot.resolve("modern-gradient").resolve("login"), null),
        new VariantSpec("horizontal-card", "base", arguments.presetRoot.resolve("horizontal-card").resolve("login"), null)
    ));

    for (Path userThemeDir : arguments.userThemeDirs) {
      Path userLogin = userThemeDir.resolve("login");
      Path userThemeProps = userLogin.resolve("theme.properties");
      String baseTheme = "base";
      String presetId = null;
      if (Files.exists(userThemeProps)) {
        String content = new String(Files.readAllBytes(userThemeProps), StandardCharsets.UTF_8);
        for (String line : content.split("\\R")) {
          String trimmed = line.trim();
          if (trimmed.startsWith("preset=")) {
            presetId = trimmed.substring(7).trim();
          } else if (trimmed.startsWith("parent=")) {
            String parent = trimmed.substring(7).trim();
            if (parent.contains("v2")) {
              baseTheme = "v2";
            }
          }
        }
      }

      String variantId = userThemeDir.getFileName().toString();
      if (presetId != null && !presetId.isEmpty()) {
        Path presetLogin = arguments.presetRoot.resolve(presetId).resolve("login");
        if (Files.exists(presetLogin)) {
          if (presetId.contains("v2")) {
            baseTheme = "v2";
          }
          variants.add(new VariantSpec(variantId, baseTheme, presetLogin, userLogin));
        } else {
          System.err.println("Warning: preset '" + presetId + "' not found, ignoring preset= directive.");
          variants.add(new VariantSpec(variantId, baseTheme, userLogin, null));
        }
      } else {
        variants.add(new VariantSpec(variantId, baseTheme, userLogin, null));
      }
    }

    return variants;
  }

  private VariantRenderResult renderVariantPages(
      VariantSpec variant,
      VariantLoader.VariantInputs inputs,
      ContextBuilder.ContextOverrides contextOverrides
  ) {
    Map<String, Map<String, String>> variantPages = new LinkedHashMap<String, Map<String, String>>();
    List<String> skippedTemplates = new ArrayList<String>();

    for (String pageTemplate : inputs.getPageTemplates()) {
      String pageId = pageTemplate.replace(".ftl", ".html");
      String pageName = normalizePageName(pageTemplate);

      Map<String, String> pageStories = renderPageWithStories(
          variant, inputs, contextOverrides, pageTemplate, pageId, pageName, skippedTemplates
      );

      if (pageStories != null && !pageStories.isEmpty()) {
        variantPages.put(pageId, pageStories);
      }
    }

    return new VariantRenderResult(variantPages, skippedTemplates);
  }

  private Map<String, String> renderPageWithStories(
      VariantSpec variant,
      VariantLoader.VariantInputs inputs,
      ContextBuilder.ContextOverrides contextOverrides,
      String pageTemplate,
      String pageId,
      String pageName,
      List<String> skippedTemplates
  ) {
    Map<String, Object> defaultContext = contextBuilder.buildPageContextOverride(contextOverrides, pageName);
    // If no page-specific mock exists, fall back to the login page context.
    // Most custom pages extend the login template and need url, realm, etc.
    if (defaultContext.isEmpty() && !pageName.equals("login")) {
      defaultContext = contextBuilder.buildPageContextOverride(contextOverrides, "login");
    }

    String defaultHtml;
    try {
      defaultHtml = pageRenderer.renderPage(
          pageTemplate, pageId, variant.id, variant.overlayDir, variant.userOverlayDir, inputs, defaultContext
      );
    } catch (Exception error) {
      skippedTemplates.add(pageTemplate + ": " + summarizeError(error));
      return null;
    }

    if (defaultHtml.trim().isEmpty()) {
      skippedTemplates.add(pageTemplate + ": renders empty output (macro-only template)");
      return null;
    }

    Map<String, String> stories = new LinkedHashMap<String, String>();
    stories.put("default", defaultHtml);

    String storyKeyPrefix = pageName + "@";
    for (String pageKey : contextOverrides.getPages().keySet()) {
      if (!pageKey.startsWith(storyKeyPrefix)) {
        continue;
      }
      String storyId = pageKey.substring(storyKeyPrefix.length());
      try {
        Map<String, Object> storyContext = contextBuilder.buildPageContextOverride(contextOverrides, pageKey);
        String storyHtml = pageRenderer.renderPage(
            pageTemplate, pageId, variant.id, variant.overlayDir, variant.userOverlayDir, inputs, storyContext
        );
        if (!storyHtml.trim().isEmpty()) {
          stories.put(storyId, storyHtml);
        }
      } catch (Exception storyError) {
        skippedTemplates.add(pageTemplate + "/" + storyId + ": " + summarizeError(storyError));
      }
    }

    return stories;
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

  private void writeOutputs(Map<String, Object> pagesOutput) throws IOException {
    Files.createDirectories(arguments.outputRoot);
    writeJson(arguments.outputRoot.resolve("pages.json"), buildPagesOutputEnvelope(pagesOutput));
  }

  private Map<String, Object> buildPagesOutputEnvelope(Map<String, Object> pageVariants) {
    Map<String, Object> output = new LinkedHashMap<String, Object>();
    output.put("generatedAt", Instant.now().toString());
    output.put("keycloakTag", arguments.keycloakTag);
    output.put("variants", pageVariants);
    return output;
  }

  private void writeJson(Path outputPath, Map<String, Object> value) throws IOException {
    Files.createDirectories(outputPath.getParent());
    String json = objectMapper.writeValueAsString(value) + "\n";
    Files.write(outputPath, json.getBytes(StandardCharsets.UTF_8));
  }

  private String normalizePageName(String pageTemplateName) {
    String value = pageTemplateName == null ? "" : pageTemplateName.trim();
    if (value.endsWith(".ftl")) {
      value = value.substring(0, value.length() - 4);
    }
    return value;
  }

  private static final class VariantSpec {
    private final String id;
    private final String baseTheme;
    private final Path overlayDir;
    private final Path userOverlayDir;

    private VariantSpec(String id, String baseTheme, Path overlayDir, Path userOverlayDir) {
      this.id = id;
      this.baseTheme = baseTheme;
      this.overlayDir = overlayDir;
      this.userOverlayDir = userOverlayDir;
    }
  }

  private static final class VariantRenderResult {
    private final Map<String, Map<String, String>> variantPages;
    private final List<String> skippedTemplates;

    private VariantRenderResult(
        Map<String, Map<String, String>> variantPages,
        List<String> skippedTemplates
    ) {
      this.variantPages = variantPages;
      this.skippedTemplates = skippedTemplates;
    }
  }

  private static final class Arguments {
    private final Path inputRoot;
    private final Path overrideRoot;
    private final Path presetRoot;
    private final Path outputRoot;
    private final Path contextMocksPath;
    private final List<Path> userThemeDirs;
    private final String keycloakTag;

    private Arguments(
        Path inputRoot,
        Path overrideRoot,
        Path presetRoot,
        Path outputRoot,
        Path contextMocksPath,
        List<Path> userThemeDirs,
        String keycloakTag
    ) {
      this.inputRoot = inputRoot;
      this.overrideRoot = overrideRoot;
      this.presetRoot = presetRoot;
      this.outputRoot = outputRoot;
      this.contextMocksPath = contextMocksPath;
      this.userThemeDirs = userThemeDirs;
      this.keycloakTag = keycloakTag;
    }

    private static final int MAX_DISCOVERY_DEPTH = 5;

    private static List<Path> discoverThemeDirs(Path dir) {
      return discoverThemeDirs(dir, MAX_DISCOVERY_DEPTH);
    }

    private static List<Path> discoverThemeDirs(Path dir, int depth) {
      List<Path> result = new ArrayList<Path>();
      if (dir == null || depth <= 0 || !Files.isDirectory(dir)) {
        return result;
      }
      if (Files.exists(dir.resolve("login").resolve("theme.properties"))) {
        result.add(dir);
        return result;
      }
      try {
        for (Path child : Files.newDirectoryStream(dir)) {
          if (Files.isDirectory(child)) {
            String name = child.getFileName().toString();
            if (name.startsWith(".") || name.equals("node_modules") || name.equals("dist") || name.equals("build") || name.equals("target")) {
              continue;
            }
            result.addAll(discoverThemeDirs(child, depth - 1));
          }
        }
      } catch (IOException ignored) {
      }
      return result;
    }

    private static Arguments from(String[] args) {
      Map<String, String> values = new HashMap<String, String>();
      for (int i = 0; i < args.length; i++) {
        String key = args[i];
        if (!key.startsWith("--")) {
          continue;
        }

        int separatorIndex = key.indexOf('=');
        if (separatorIndex > 2) {
          values.put(key.substring(2, separatorIndex), key.substring(separatorIndex + 1));
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

      String contextMocks = values.get("context-mocks");
      if (contextMocks == null || contextMocks.trim().isEmpty()) {
        throw new IllegalArgumentException("Missing required argument: --context-mocks=<path-to-json>");
      }
      Path contextMocksPath = Paths.get(contextMocks.trim());

      List<Path> userThemeDirs = new ArrayList<Path>();
      String userThemeValue = values.get("user-theme");
      if (userThemeValue != null && !userThemeValue.trim().isEmpty()) {
        userThemeDirs = discoverThemeDirs(Paths.get(userThemeValue.trim()));
      }

      String keycloakTag = values.getOrDefault("tag", "26.x");

      return new Arguments(
          inputRoot,
          overrideRoot,
          presetRoot,
          outputRoot,
          contextMocksPath,
          userThemeDirs,
          keycloakTag
      );
    }
  }
}
