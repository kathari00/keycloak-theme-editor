package com.keycloaktheme.preview;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public final class VariantLoader {
  private static final Set<String> EXCLUDED_PAGE_TEMPLATES = new LinkedHashSet<String>(
      Arrays.asList("template.ftl", "footer.ftl", "field.ftl", "passkeys.ftl", "cli_splash.ftl")
  );

  private final Path overrideRoot;

  public VariantLoader(Path overrideRoot) {
    this.overrideRoot = overrideRoot;
  }

  public VariantInputs loadVariantInputs(Path inputRoot, String baseTheme, Path overlayDir, Path userOverlayDir) throws IOException {
    Path baseThemeLoginDir = inputRoot.resolve(baseTheme).resolve("login");
    Path localOverrideLoginDir = overrideRoot.resolve(baseTheme).resolve("login");
    Path inheritedBaseLoginDir = inputRoot.resolve("base").resolve("login");
    Path messagesPath = inputRoot.resolve(baseTheme).resolve("messages").resolve("messages_en.properties");
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
    if (overlayDir != null) {
      Path overlayThemePropertiesPath = overlayDir.resolve("theme.properties");
      if (Files.exists(overlayThemePropertiesPath)) {
        themeProperties.putAll(parseJavaProperties(readUtf8(overlayThemePropertiesPath)));
      }
    }
    if (userOverlayDir != null) {
      Path userThemePropertiesPath = userOverlayDir.resolve("theme.properties");
      if (Files.exists(userThemePropertiesPath)) {
        themeProperties.putAll(parseJavaProperties(readUtf8(userThemePropertiesPath)));
      }
    }

    Map<String, String> messages = parseJavaProperties(readUtf8(messagesPath));
    Path overrideMessagesPath = localOverrideLoginDir.resolve("messages").resolve("messages_en.properties");
    if (Files.exists(overrideMessagesPath)) {
      messages.putAll(parseJavaProperties(readUtf8(overrideMessagesPath)));
    }
    if (overlayDir != null) {
      Path overlayMessagesPath = overlayDir.resolve("messages").resolve("messages_en.properties");
      if (Files.exists(overlayMessagesPath)) {
        messages.putAll(parseJavaProperties(readUtf8(overlayMessagesPath)));
      }
    }
    if (userOverlayDir != null) {
      Path userMessagesPath = userOverlayDir.resolve("messages").resolve("messages_en.properties");
      if (Files.exists(userMessagesPath)) {
        messages.putAll(parseJavaProperties(readUtf8(userMessagesPath)));
      }
    }

    List<String> pageTemplates = listPageTemplates(
        baseThemeLoginDir,
        inheritedBaseLoginDir,
        localOverrideLoginDir,
        overlayDir,
        userOverlayDir
    );

    return new VariantInputs(
        localOverrideLoginDir,
        baseThemeLoginDir,
        inheritedBaseLoginDir,
        themeProperties,
        messages,
        pageTemplates
    );
  }

  private List<String> listPageTemplates(
      Path baseThemeLoginDir,
      Path inheritedBaseLoginDir,
      Path localOverrideLoginDir,
      Path overlayDir,
      Path userOverlayDir
  ) throws IOException {
    Set<String> templates = new LinkedHashSet<String>();
    templates.addAll(collectPageTemplateNames(userOverlayDir));
    templates.addAll(collectPageTemplateNames(overlayDir));
    templates.addAll(collectPageTemplateNames(localOverrideLoginDir));
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

  private String readUtf8(Path path) throws IOException {
    return new String(Files.readAllBytes(path), StandardCharsets.UTF_8);
  }

  public static final class VariantInputs {
    private final Path localOverrideLoginDir;
    private final Path baseThemeLoginDir;
    private final Path inheritedBaseLoginDir;
    private final Map<String, String> themeProperties;
    private final Map<String, String> messages;
    private final List<String> pageTemplates;

    public VariantInputs(
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

    public Path getLocalOverrideLoginDir() {
      return localOverrideLoginDir;
    }

    public Path getBaseThemeLoginDir() {
      return baseThemeLoginDir;
    }

    public Path getInheritedBaseLoginDir() {
      return inheritedBaseLoginDir;
    }

    public Map<String, String> getThemeProperties() {
      return themeProperties;
    }

    public Map<String, String> getMessages() {
      return messages;
    }

    public List<String> getPageTemplates() {
      return pageTemplates;
    }
  }
}
