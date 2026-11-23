package com.keycloaktheme.preview;

import freemarker.template.TemplateMethodModelEx;
import freemarker.template.TemplateModelException;
import java.text.MessageFormat;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class ContextObjects {
  private ContextObjects() {
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
        return pattern.replace("''", "'");
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

  public static final class AdvancedMessageMethod implements TemplateMethodModelEx {
    private static final Pattern MESSAGE_EXPRESSION = Pattern.compile("\\$\\{([^}]+)\\}");
    private final Map<String, String> messages;

    public AdvancedMessageMethod(Map<String, String> messages) {
      this.messages = messages;
    }

    @Override
    public Object exec(@SuppressWarnings("rawtypes") List arguments) {
      if (arguments.isEmpty()) {
        return "";
      }

      String value = String.valueOf(arguments.get(0));
      Matcher matcher = MESSAGE_EXPRESSION.matcher(value);
      StringBuffer output = new StringBuffer();
      boolean replaced = false;

      while (matcher.find()) {
        replaced = true;
        String key = matcher.group(1).trim();
        String message = messages.getOrDefault(key, matcher.group(0));
        matcher.appendReplacement(output, Matcher.quoteReplacement(message));
      }

      if (!replaced) {
        return value;
      }

      matcher.appendTail(output);
      return output.toString();
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

  /**
   * A user profile attribute group. Templates compare it with strings (`group != currentGroup`),
   * which works for Keycloak's bean because FreeMarker reads its toString(): the group name.
   */
  public static final class AttributeGroupContext {
    private final Map<?, ?> values;

    private AttributeGroupContext(Map<?, ?> values) {
      this.values = values;
    }

    /** Wraps every attribute's group map in profile.attributes and profile.attributesByName. */
    public static void wrapProfileGroups(Object profile) {
      if (!(profile instanceof Map)) {
        return;
      }
      Map<?, ?> profileMap = (Map<?, ?>) profile;
      Object attributes = profileMap.get("attributes");
      if (attributes instanceof List) {
        for (Object attribute : (List<?>) attributes) {
          wrapGroup(attribute);
        }
      }
      Object byName = profileMap.get("attributesByName");
      if (byName instanceof Map) {
        for (Object attribute : ((Map<?, ?>) byName).values()) {
          wrapGroup(attribute);
        }
      }
    }

    @SuppressWarnings("unchecked")
    private static void wrapGroup(Object attribute) {
      if (attribute instanceof Map && ((Map<?, ?>) attribute).get("group") instanceof Map) {
        Map<String, Object> attributeMap = (Map<String, Object>) attribute;
        attributeMap.put("group", new AttributeGroupContext((Map<?, ?>) attributeMap.get("group")));
      }
    }

    public Object getName() {
      return values.get("name");
    }

    public Object getDisplayHeader() {
      return values.get("displayHeader");
    }

    public Object getDisplayDescription() {
      return values.get("displayDescription");
    }

    public Object getHtml5DataAnnotations() {
      Object annotations = values.get("html5DataAnnotations");
      return annotations == null ? Collections.emptyMap() : annotations;
    }

    @Override
    public String toString() {
      Object name = values.get("name");
      return name == null ? "" : name.toString();
    }
  }

  /** The OTP policy bean; values come from the mock's totp.policy, with Keycloak's defaults. */
  public static final class TotpPolicyContext {
    private String algorithmKey = "HmacSHA1";
    private int digits = 6;
    private String type = "totp";
    private int period = 30;
    private int initialCounter = 0;

    public static TotpPolicyContext fromMap(Object raw) {
      TotpPolicyContext context = new TotpPolicyContext();
      if (!(raw instanceof Map)) {
        return context;
      }
      Map<?, ?> values = (Map<?, ?>) raw;
      Object algorithm = values.containsKey("algorithmKey") ? values.get("algorithmKey") : values.get("algorithm");
      if (algorithm != null) {
        context.algorithmKey = String.valueOf(algorithm);
      }
      if (values.get("type") != null) {
        context.type = String.valueOf(values.get("type"));
      }
      context.digits = intValue(values.get("digits"), context.digits);
      context.period = intValue(values.get("period"), context.period);
      context.initialCounter = intValue(values.get("initialCounter"), context.initialCounter);
      return context;
    }

    private static int intValue(Object value, int fallback) {
      if (value instanceof Number) {
        return ((Number) value).intValue();
      }
      try {
        return value == null ? fallback : Integer.parseInt(String.valueOf(value));
      } catch (NumberFormatException error) {
        return fallback;
      }
    }

    public String getAlgorithmKey() {
      return algorithmKey;
    }

    public int getDigits() {
      return digits;
    }

    public String getType() {
      return type;
    }

    public int getPeriod() {
      return period;
    }

    public int getInitialCounter() {
      return initialCounter;
    }
  }
}
