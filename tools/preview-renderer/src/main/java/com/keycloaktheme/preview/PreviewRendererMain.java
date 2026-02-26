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

    ContextBuilder.ContextOverrides builtInOverrides = contextBuilder.readContextOverrides(arguments.contextMocksPath);
    ContextBuilder.ContextOverrides contextOverrides = contextBuilder.mergeCustomMocks(
        builtInOverrides,
        arguments.customMocksPath
    );

    for (VariantSpec variant : getVariants()) {
      VariantLoader.VariantInputs inputs = variantLoader.loadVariantInputs(
          arguments.inputRoot,
          variant.baseTheme,
          variant.overlayDir
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

  private List<VariantSpec> getVariants() {
    return Arrays.asList(
        new VariantSpec("base", "base", null),
        new VariantSpec("v2", "v2", null),
        new VariantSpec("modern-gradient", "base", arguments.presetRoot.resolve("modern-gradient").resolve("login")),
        new VariantSpec("horizontal-card", "base", arguments.presetRoot.resolve("horizontal-card").resolve("login"))
    );
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
      Map<String, Object> pageContextOverride = contextBuilder.buildPageContextOverride(contextOverrides, pageName);

      try {
        String html = pageRenderer.renderPage(
            pageTemplate,
            pageId,
            variant.id,
            variant.overlayDir,
            inputs,
            pageContextOverride
        );

        if (html.trim().isEmpty()) {
          skippedTemplates.add(pageTemplate + ": renders empty output (macro-only template)");
          continue;
        }

        Map<String, String> pageStories = new LinkedHashMap<String, String>();
        pageStories.put("default", html);
        variantPages.put(pageId, pageStories);
      } catch (Exception error) {
        skippedTemplates.add(pageTemplate + ": " + summarizeError(error));
      }
    }

    return new VariantRenderResult(variantPages, skippedTemplates);
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

    private VariantSpec(String id, String baseTheme, Path overlayDir) {
      this.id = id;
      this.baseTheme = baseTheme;
      this.overlayDir = overlayDir;
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
    private final Path customMocksPath;
    private final String keycloakTag;

    private Arguments(
        Path inputRoot,
        Path overrideRoot,
        Path presetRoot,
        Path outputRoot,
        Path contextMocksPath,
        Path customMocksPath,
        String keycloakTag
    ) {
      this.inputRoot = inputRoot;
      this.overrideRoot = overrideRoot;
      this.presetRoot = presetRoot;
      this.outputRoot = outputRoot;
      this.contextMocksPath = contextMocksPath;
      this.customMocksPath = customMocksPath;
      this.keycloakTag = keycloakTag;
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

      Path customMocksPath = null;
      String customMocksValue = values.get("custom-mocks");
      if (customMocksValue != null && !customMocksValue.trim().isEmpty()) {
        customMocksPath = Paths.get(customMocksValue.trim());
      }

      String keycloakTag = values.getOrDefault("tag", "26.x");

      return new Arguments(
          inputRoot,
          overrideRoot,
          presetRoot,
          outputRoot,
          contextMocksPath,
          customMocksPath,
          keycloakTag
      );
    }
  }
}
