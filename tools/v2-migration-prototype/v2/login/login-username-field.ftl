<#import "field.ftl" as field>

<#macro show label value="" error="" invalid=false errorId="input-error-username" tabindex=2 autocomplete="username">
    <@field.input name="username" label=label value=value error=error autofocus=true autocomplete=autocomplete />
</#macro>
