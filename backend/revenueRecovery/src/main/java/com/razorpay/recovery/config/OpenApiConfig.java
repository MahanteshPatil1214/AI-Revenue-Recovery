package com.razorpay.recovery.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.Components;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String ADMIN_KEY = "AdminApiKey";

    @Bean
    public OpenAPI revenueRecoveryOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Razorpay AI Revenue Recovery Engine — API")
                        .description(
                                "Autonomous smart-dunning & revenue-recovery API.\n\n" +
                                "Operator endpoints under /api/v1/admin, /api/v1/radar and /api/v1/test are gated " +
                                "by the `X-Admin-Key` header. Use the Authorize button and set it to your ADMIN_API_KEY " +
                                "(default in the live demo: dev_admin_key_2026).")
                        .version("1.0.0"))
                .addSecurityItem(new SecurityRequirement().addList(ADMIN_KEY))
                .components(new Components().addSecuritySchemes(
                        ADMIN_KEY,
                        new SecurityScheme()
                                .name("X-Admin-Key")
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER)));
    }
}
