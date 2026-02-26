package com.keycloaktheme.preview;

import freemarker.template.TemplateMethodModelEx;
import freemarker.template.TemplateModelException;
import java.text.MessageFormat;
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
    public String getAlgorithmKey() {
      return "HmacSHA1";
    }

    public int getDigits() {
      return 6;
    }

    public String getType() {
      return "totp";
    }

    public int getPeriod() {
      return 30;
    }

    public int getInitialCounter() {
      return 0;
    }
  }
}
