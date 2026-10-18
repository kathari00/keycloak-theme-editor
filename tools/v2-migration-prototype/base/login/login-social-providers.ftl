<#macro show social headingLevel=2>
    <div id="kc-social-providers" class="${properties.kcFormSocialAccountSectionClass!}">
        <hr/>
        <#if headingLevel == 4>
            <h4>${msg("identity-provider-login-label")}</h4>
        <#else>
            <h2>${msg("identity-provider-login-label")}</h2>
        </#if>
        <ul class="${properties.kcFormSocialAccountListClass!} <#if social.providers?size gt 3>${properties.kcFormSocialAccountListGridClass!}</#if>">
            <#list social.providers as p>
                <li>
                    <a data-once-link data-disabled-class="${properties.kcFormSocialAccountListButtonDisabledClass!}" id="social-${p.alias}"
                       class="${properties.kcFormSocialAccountListButtonClass!} <#if social.providers?size gt 3>${properties.kcFormSocialAccountGridItem!}</#if>"
                       type="button" href="${p.loginUrl}">
                        <#if p.iconClasses?has_content>
                            <i class="${properties.kcCommonLogoIdP!} ${p.iconClasses!}" aria-hidden="true"></i>
                            <span class="${properties.kcFormSocialAccountNameClass!} kc-social-icon-text">${p.displayName!}</span>
                        <#else>
                            <span class="${properties.kcFormSocialAccountNameClass!}">${p.displayName!}</span>
                        </#if>
                    </a>
                </li>
            </#list>
        </ul>
    </div>
</#macro>
