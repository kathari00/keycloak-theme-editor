package com.keycloaktheme.preview;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class ContextBuilder {
  private final ObjectMapper objectMapper;

  public ContextBuilder(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public ContextOverrides readContextOverrides(Path path) throws IOException {
    Map<String, Map<String, Object>> emptyPages = new LinkedHashMap<String, Map<String, Object>>();
    if (path == null || !Files.exists(path)) {
      return new ContextOverrides(emptyPages, defaultLocales());
    }

    String json = readUtf8(path);
    if (!json.isEmpty() && json.charAt(0) == '\uFEFF') {
      json = json.substring(1);
    }

    @SuppressWarnings("unchecked")
    Map<String, Object> raw = objectMapper.readValue(json, Map.class);
    Map<String, Map<String, Object>> pages = new LinkedHashMap<String, Map<String, Object>>();
    Map<String, Object> rawPages = asMap(raw.get("pages"));

    for (Map.Entry<String, Object> entry : rawPages.entrySet()) {
      String key = entry.getKey();
      if (key == null || key.trim().isEmpty()) {
        continue;
      }
      pages.put(key.trim(), asMap(entry.getValue()));
    }

    return new ContextOverrides(pages, readLocales(raw.get("locales")));
  }

  /**
   * Reads the locales to render. The editor owns the tag-to-bundle mapping and
   * the per-locale FreeMarker context, so this only unpacks what it was given.
   */
  private List<LocaleSpec> readLocales(Object rawLocales) {
    if (!(rawLocales instanceof List)) {
      return defaultLocales();
    }

    List<LocaleSpec> locales = new ArrayList<LocaleSpec>();
    for (Object item : (List<?>) rawLocales) {
      if (!(item instanceof Map)) {
        continue;
      }
      Map<String, Object> entry = asMap(item);
      Object tag = entry.get("tag");
      if (tag == null || tag.toString().trim().isEmpty()) {
        continue;
      }
      Object suffix = entry.get("suffix");
      String resolvedSuffix = suffix == null || suffix.toString().trim().isEmpty()
          ? tag.toString().trim()
          : suffix.toString().trim();
      locales.add(new LocaleSpec(tag.toString().trim(), resolvedSuffix, asMap(entry.get("context"))));
    }

    return locales.isEmpty() ? defaultLocales() : locales;
  }

  private List<LocaleSpec> defaultLocales() {
    List<LocaleSpec> locales = new ArrayList<LocaleSpec>();
    locales.add(new LocaleSpec(
        VariantLoader.BASE_LOCALE_SUFFIX,
        VariantLoader.BASE_LOCALE_SUFFIX,
        new LinkedHashMap<String, Object>()
    ));
    return locales;
  }

  public Map<String, Object> buildPageContextOverride(ContextOverrides overrides, String pageKey) {
    return buildPageContextOverride(overrides, pageKey, null);
  }

  public Map<String, Object> buildPageContextOverride(
      ContextOverrides overrides,
      String pageKey,
      Map<String, Object> localeContext
  ) {
    Map<String, Object> merged = new LinkedHashMap<String, Object>();
    Map<String, Object> pageOverride = overrides.getPages().get(pageKey);
    if (pageOverride != null && !pageOverride.isEmpty()) {
      deepMergeMap(merged, pageOverride);
    }
    // The active language wins over the page mock, which only carries defaults.
    if (localeContext != null && !localeContext.isEmpty()) {
      deepMergeMap(merged, localeContext);
    }
    return merged;
  }

  public void deepMergeMap(Map<String, Object> target, Map<String, Object> source) {
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

  public Map<String, Object> deepCopyMap(Map<String, Object> source) {
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

  private Map<String, Object> asMap(Object value) {
    if (!(value instanceof Map)) {
      return new LinkedHashMap<String, Object>();
    }
    @SuppressWarnings("unchecked")
    Map<String, Object> map = (Map<String, Object>) value;
    return new LinkedHashMap<String, Object>(map);
  }

  private String readUtf8(Path path) throws IOException {
    return new String(Files.readAllBytes(path), StandardCharsets.UTF_8);
  }

  /** One preview language: how to name its output, which bundle to read, and what to put in the context. */
  public static final class LocaleSpec {
    private final String tag;
    private final String suffix;
    private final Map<String, Object> context;

    public LocaleSpec(String tag, String suffix, Map<String, Object> context) {
      this.tag = tag;
      this.suffix = suffix;
      this.context = context;
    }

    public String getTag() {
      return tag;
    }

    public String getSuffix() {
      return suffix;
    }

    public Map<String, Object> getContext() {
      return context;
    }
  }

  public static final class ContextOverrides {
    private final Map<String, Map<String, Object>> pages;
    private final List<LocaleSpec> locales;

    public ContextOverrides(Map<String, Map<String, Object>> pages, List<LocaleSpec> locales) {
      this.pages = pages;
      this.locales = locales;
    }

    public Map<String, Map<String, Object>> getPages() {
      return pages;
    }

    public List<LocaleSpec> getLocales() {
      return locales;
    }
  }
}
