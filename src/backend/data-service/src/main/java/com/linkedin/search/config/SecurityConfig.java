package com.linkedin.search.config;

import org.springframework.context.annotation.Bean; // version: 6.0.0
import org.springframework.context.annotation.Configuration; // version: 6.0.0
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity; // version: 6.0.0
import org.springframework.security.config.annotation.web.builders.HttpSecurity; // version: 6.0.0
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity; // version: 6.0.0
import org.springframework.security.config.http.SessionCreationPolicy; // version: 6.0.0
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder; // version: 6.0.0
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint; // version: 6.0.0
import org.springframework.security.oauth2.server.resource.web.access.BearerTokenAccessDeniedHandler; // version: 6.0.0
import org.springframework.security.web.SecurityFilterChain; // version: 6.0.0
import org.springframework.security.web.csrf.CookieCsrfTokenRepository; // version: 6.0.0
import org.springframework.web.cors.CorsConfiguration; // version: 6.0.0
import org.springframework.web.cors.CorsConfigurationSource; // version: 6.0.0
import org.springframework.web.cors.UrlBasedCorsConfigurationSource; // version: 6.0.0
import io.github.resilience4j.ratelimiter.RateLimiter; // version: 2.1.0
import io.github.resilience4j.ratelimiter.RateLimiterConfig; // version: 2.1.0
import org.springframework.security.authentication.event.SecurityEventPublisher; // version: 6.0.0
import org.springframework.security.authentication.event.LoggerListener; // version: 6.0.0
import org.springframework.core.env.Environment; // version: 6.0.0
import javax.servlet.Filter;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;

/**
 * Comprehensive security configuration implementing enterprise-grade security measures
 * for the LinkedIn Profile Search system. Includes authentication, authorization,
 * CORS, rate limiting, and security monitoring capabilities.
 */
@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final Environment environment;
    private final String jwtSecret;
    private final String[] allowedOrigins;
    private final Long maxSessionDuration;
    private final Integer rateLimit;
    private final Duration rateLimitRefreshPeriod;
    private final String securityEventsTopic;

    /**
     * Initializes security configuration with environment-specific settings
     * @param environment Spring Environment for property access
     */
    public SecurityConfig(Environment environment) {
        this.environment = environment;
        this.jwtSecret = environment.getRequiredProperty("security.jwt.secret");
        this.allowedOrigins = environment.getRequiredProperty("security.cors.allowed-origins").split(",");
        this.maxSessionDuration = environment.getProperty("security.session.max-duration", Long.class, 3600L);
        this.rateLimit = environment.getProperty("security.rate-limit.requests", Integer.class, 100);
        this.rateLimitRefreshPeriod = Duration.ofSeconds(
            environment.getProperty("security.rate-limit.refresh-period", Long.class, 60L)
        );
        this.securityEventsTopic = environment.getProperty("security.events.topic", "security-events");
    }

    /**
     * Configures comprehensive security filter chain with all security measures
     * @param http HttpSecurity to configure
     * @return Configured SecurityFilterChain
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            // CSRF protection
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .ignoringAntMatchers("/health", "/metrics")
            )
            // CORS configuration
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // Session management
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .maximumSessions(1)
                .maxSessionsPreventsLogin(true)
            )
            // JWT authentication
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .decoder(jwtDecoder())
                )
                .authenticationEntryPoint(new BearerTokenAuthenticationEntryPoint())
                .accessDeniedHandler(new BearerTokenAccessDeniedHandler())
            )
            // Authorization rules
            .authorizeRequests(authorize -> authorize
                .antMatchers("/health/**", "/metrics/**").permitAll()
                .antMatchers("/api/v1/public/**").permitAll()
                .antMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .antMatchers("/api/v1/recruiter/**").hasRole("RECRUITER")
                .anyRequest().authenticated()
            )
            // Security headers
            .headers(headers -> headers
                .frameOptions().deny()
                .xssProtection().block()
                .contentSecurityPolicy("default-src 'self'; frame-ancestors 'none'")
                .referrerPolicy().sameOrigin()
                .permissionsPolicy().policy("camera=(), microphone=(), geolocation=()")
                .httpStrictTransportSecurity().maxAgeInSeconds(31536000)
            )
            // Exception handling
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(new BearerTokenAuthenticationEntryPoint())
                .accessDeniedHandler(new BearerTokenAccessDeniedHandler())
            )
            .build();
    }

    /**
     * Configures CORS with environment-specific settings
     * @return Configured CorsConfigurationSource
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(allowedOrigins));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization", "Content-Type", "X-Requested-With", 
            "X-XSRF-TOKEN", "X-Frame-Options"
        ));
        configuration.setExposedHeaders(Arrays.asList(
            "X-Rate-Limit-Remaining", "X-Rate-Limit-Reset"
        ));
        configuration.setMaxAge(3600L);
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /**
     * Configures rate limiting for API endpoints
     * @return Configured rate limiting filter
     */
    @Bean
    public Filter rateLimitingFilter() {
        RateLimiterConfig config = RateLimiterConfig.custom()
            .limitRefreshPeriod(rateLimitRefreshPeriod)
            .limitForPeriod(rateLimit)
            .timeoutDuration(Duration.ofSeconds(1))
            .build();

        RateLimiter rateLimiter = RateLimiter.of("api-rate-limiter", config);

        return new RateLimitingFilter(rateLimiter, 
            List.of("/api/v1/"), // Protected paths
            List.of("/health/", "/metrics/") // Excluded paths
        );
    }

    /**
     * Configures security event publishing for monitoring
     * @return Configured SecurityEventPublisher
     */
    @Bean
    public SecurityEventPublisher securityEventPublisher() {
        LoggerListener loggerListener = new LoggerListener();
        return new DelegatingSecurityEventPublisher(
            loggerListener,
            new SecurityEventKafkaPublisher(securityEventsTopic)
        );
    }

    /**
     * Configures password encoder for secure password handling
     * @return Configured BCryptPasswordEncoder
     */
    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    /**
     * Configures JWT decoder with security settings
     * @return Configured JwtDecoder
     */
    private JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder.withSecretKey(getSecretKey())
            .jwtProcessorCustomizer(processor -> {
                processor.setJWSTypeVerifier(new DefaultJOSEObjectTypeVerifier<>(JOSEObjectType.JWT));
            })
            .build();
    }

    private SecretKey getSecretKey() {
        byte[] keyBytes = Base64.getDecoder().decode(jwtSecret);
        return new SecretKeySpec(keyBytes, "HmacSHA256");
    }
}