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

  public ContextOverrides mergeCustomMocks(ContextOverrides builtIn, Path customMocksPath) throws IOException {
    if (customMocksPath == null || !Files.exists(customMocksPath)) {
      return builtIn;
    }

    ContextOverrides custom = readContextOverrides(customMocksPath);
    Map<String, Object> mergedCommon = deepCopyMap(builtIn.getCommon());
    deepMergeMap(mergedCommon, custom.getCommon());

    Map<String, Map<String, Object>> mergedPages = deepCopyPages(builtIn.getPages());
    for (Map.Entry<String, Map<String, Object>> entry : custom.getPages().entrySet()) {
      String pageName = normalizePageName(entry.getKey());
      if (pageName.isEmpty()) {
        continue;
      }

      Map<String, Object> pageTarget = mergedPages.get(pageName);
      if (pageTarget == null) {
        mergedPages.put(pageName, deepCopyMap(entry.getValue()));
        continue;
      }

      deepMergeMap(pageTarget, entry.getValue());
    }

    return new ContextOverrides(mergedCommon, mergedPages);
  }

  public Map<String, Object> buildPageContextOverride(ContextOverrides overrides, String pageName) {
    Map<String, Object> merged = deepCopyMap(overrides.getCommon());
    Map<String, Object> pageOverride = overrides.getPages().get(normalizePageName(pageName));
    if (pageOverride != null && !pageOverride.isEmpty()) {
      deepMergeMap(merged, pageOverride);
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

  private Map<String, Map<String, Object>> deepCopyPages(Map<String, Map<String, Object>> source) {
    Map<String, Map<String, Object>> copy = new LinkedHashMap<String, Map<String, Object>>();
    if (source == null) {
      return copy;
    }

    for (Map.Entry<String, Map<String, Object>> entry : source.entrySet()) {
      copy.put(entry.getKey(), deepCopyMap(entry.getValue()));
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

  private String normalizePageName(String pageTemplateName) {
    String value = pageTemplateName == null ? "" : pageTemplateName.trim();
    if (value.endsWith(".ftl")) {
      value = value.substring(0, value.length() - 4);
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

  public static final class ContextOverrides {
    private final Map<String, Object> common;
    private final Map<String, Map<String, Object>> pages;

    public ContextOverrides(Map<String, Object> common, Map<String, Map<String, Object>> pages) {
      this.common = common;
      this.pages = pages;
    }

    public Map<String, Object> getCommon() {
      return common;
    }

    public Map<String, Map<String, Object>> getPages() {
      return pages;
    }
  }
}
