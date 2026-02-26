<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false displayInfo=false; section>
  <#if section = "header">
    ${mockExtensionTitle!"KcContext mock extension showcase"}
  <#elseif section = "form">
    <div id="kc-form">
      <div id="kc-form-wrapper">
        <p style="margin-bottom: 0.9rem;">${mockExtensionIntro!"This custom page demonstrates user-extensible mock fields rendered by a custom FTL template."}</p>
        <pre style="white-space: pre-wrap; margin: 0; background: #f6f8fa; border-radius: 8px; padding: 0.9rem;">${mockExtensionSteps!"1) Checkout repository locally\n2) Add custom FTL page\n3) Provide page mocks\n4) Style in editor"}</pre>
      </div>
    </div>
  </#if>
</@layout.registrationLayout>
