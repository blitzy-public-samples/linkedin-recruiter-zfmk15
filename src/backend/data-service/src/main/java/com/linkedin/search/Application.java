package com.linkedin.search;

import org.springframework.boot.SpringApplication; // version: 3.1.0
import org.springframework.boot.autoconfigure.SpringBootApplication; // version: 3.1.0
import org.springframework.cache.annotation.EnableCaching; // version: 6.0.0
import org.springframework.scheduling.annotation.EnableScheduling; // version: 6.0.0
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity; // version: 6.0.0
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;
import io.micrometer.core.instrument.MeterRegistry; // version: 1.11.0
import io.micrometer.prometheus.PrometheusConfig; // version: 1.11.0
import io.micrometer.prometheus.PrometheusMeterRegistry; // version: 1.11.0
import org.slf4j.Logger; // version: 2.0.7
import org.slf4j.LoggerFactory; // version: 2.0.7
import java.util.Arrays;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.TimeZone;

/**
 * Main Application class for the LinkedIn Profile Search Data Service.
 * Initializes and bootstraps the Spring Boot application with enhanced features including:
 * - Caching support for improved performance
 * - Scheduled task execution for background jobs
 * - Security configuration for protected endpoints
 * - Metrics collection and monitoring
 * - Graceful shutdown handling
 */
@SpringBootApplication
@EnableCaching
@EnableScheduling
@EnableWebSecurity
public class Application {
    
    private static final Logger logger = LoggerFactory.getLogger(Application.class);
    private static final String APPLICATION_NAME = "LinkedIn Profile Search Data Service";
    private static final int SCHEDULER_POOL_SIZE = 10;

    /**
     * Main entry point for the application.
     * Configures and starts the Spring Boot application with enhanced error handling
     * and startup logging.
     *
     * @param args Command line arguments
     */
    public static void main(String[] args) {
        try {
            // Configure system properties
            configureSystemProperties();

            // Initialize metrics registry
            PrometheusMeterRegistry meterRegistry = new PrometheusMeterRegistry(PrometheusConfig.DEFAULT);

            // Create and configure Spring application
            SpringApplication app = new SpringApplication(Application.class);
            app.setRegisterShutdownHook(true);
            
            // Add startup logging
            app.addListeners(event -> {
                if (event instanceof ApplicationStartedEvent) {
                    logApplicationStartup(((ApplicationStartedEvent) event).getApplicationContext());
                }
            });

            // Start the application
            ConfigurableApplicationContext context = app.run(args);
            
            // Initialize thread pool for scheduled tasks
            initializeScheduler(context);
            
            // Register JVM shutdown hook
            registerShutdownHook(context);

            logger.info("{} started successfully", APPLICATION_NAME);
            
        } catch (Exception e) {
            logger.error("Failed to start {}: {}", APPLICATION_NAME, e.getMessage(), e);
            System.exit(1);
        }
    }

    /**
     * Configures system-wide properties for optimal performance
     */
    private static void configureSystemProperties() {
        // Set default timezone to UTC
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        
        // Configure JVM properties
        System.setProperty("java.awt.headless", "true");
        System.setProperty("file.encoding", "UTF-8");
        
        // Configure Netty properties for optimal performance
        System.setProperty("io.netty.allocator.type", "pooled");
        System.setProperty("io.netty.noPreferDirect", "true");
    }

    /**
     * Initializes the scheduler for background tasks
     * @param context Application context
     */
    private static void initializeScheduler(ConfigurableApplicationContext context) {
        ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(SCHEDULER_POOL_SIZE);
        context.getBeanFactory().registerSingleton("taskScheduler", scheduler);
        
        // Add monitoring
        MeterRegistry meterRegistry = context.getBean(MeterRegistry.class);
        meterRegistry.gauge("scheduler.pool.size", scheduler, 
            s -> ((ScheduledExecutorService) s).getPoolSize());
    }

    /**
     * Registers a shutdown hook for graceful application termination
     * @param context Application context
     */
    private static void registerShutdownHook(ConfigurableApplicationContext context) {
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            try {
                logger.info("Initiating graceful shutdown of {}", APPLICATION_NAME);
                
                // Get scheduler and initiate shutdown
                ScheduledExecutorService scheduler = context.getBean(ScheduledExecutorService.class);
                scheduler.shutdown();
                
                // Close application context
                context.close();
                
                logger.info("{} shut down successfully", APPLICATION_NAME);
            } catch (Exception e) {
                logger.error("Error during application shutdown: {}", e.getMessage(), e);
            }
        }));
    }

    /**
     * Logs application startup information including active profiles and configuration
     * @param context Application context
     */
    private static void logApplicationStartup(ConfigurableApplicationContext context) {
        Environment env = context.getEnvironment();
        String protocol = env.getProperty("server.ssl.key-store") != null ? "https" : "http";
        String serverPort = env.getProperty("server.port", "8080");
        String contextPath = env.getProperty("server.servlet.context-path", "/");
        
        logger.info("""
            
            ----------------------------------------------------------
            Application '{}' is running! Access URLs:
            Local: \t\t{}://localhost:{}{}
            Profile(s): \t{}
            ----------------------------------------------------------""",
            APPLICATION_NAME,
            protocol,
            serverPort,
            contextPath,
            Arrays.toString(env.getActiveProfiles())
        );
    }
}