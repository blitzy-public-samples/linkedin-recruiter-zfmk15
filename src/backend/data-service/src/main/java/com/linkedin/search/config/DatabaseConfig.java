package com.linkedin.search.config;

import org.springframework.context.annotation.Configuration; // version: 6.0.0
import org.springframework.transaction.annotation.EnableTransactionManagement; // version: 6.0.0
import org.springframework.data.jpa.repository.config.EnableJpaRepositories; // version: 3.1.0
import com.zaxxer.hikari.HikariConfig; // version: 5.0.1
import com.zaxxer.hikari.HikariDataSource; // version: 5.0.1
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean; // version: 6.0.0
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment; // version: 6.0.0
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import javax.sql.DataSource;
import jakarta.persistence.EntityManagerFactory;
import java.util.Properties;

/**
 * Comprehensive database configuration class implementing connection pooling,
 * transaction management, and JPA settings with security and monitoring capabilities.
 * Implements high-availability, connection pooling, and security measures for
 * the LinkedIn Profile Search system's data layer.
 */
@Configuration
@EnableTransactionManagement
@EnableJpaRepositories(basePackages = "com.linkedin.search.repositories")
public class DatabaseConfig {

    private final Environment environment;
    private final String dbUrl;
    private final String dbUsername;
    private final String dbPassword;
    private final Integer maxPoolSize = 20;
    private final Integer minIdle = 5;

    /**
     * Initializes database configuration with environment-specific settings
     * @param environment Spring Environment for property access
     */
    public DatabaseConfig(Environment environment) {
        this.environment = environment;
        // Load credentials from secure environment variables
        this.dbUrl = environment.getRequiredProperty("spring.datasource.url");
        this.dbUsername = environment.getRequiredProperty("spring.datasource.username");
        this.dbPassword = environment.getRequiredProperty("spring.datasource.password");
    }

    /**
     * Creates and configures HikariCP datasource with optimal settings
     * for high performance and security
     * @return Configured HikariCP datasource
     */
    @Bean
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        
        // Basic connection settings
        config.setJdbcUrl(dbUrl);
        config.setUsername(dbUsername);
        config.setPassword(dbPassword);
        
        // Connection pool settings
        config.setMaximumPoolSize(maxPoolSize);
        config.setMinimumIdle(minIdle);
        config.setIdleTimeout(300000); // 5 minutes
        config.setConnectionTimeout(30000); // 30 seconds
        config.setMaxLifetime(1800000); // 30 minutes
        
        // Performance settings
        config.addDataSourceProperty("cachePrepStmts", "true");
        config.addDataSourceProperty("prepStmtCacheSize", "250");
        config.addDataSourceProperty("prepStmtCacheSqlLimit", "2048");
        
        // Security settings
        config.addDataSourceProperty("useSSL", "true");
        config.addDataSourceProperty("requireSSL", "true");
        config.addDataSourceProperty("verifyServerCertificate", "true");
        
        // Health check settings
        config.setHealthCheckRegistry(new com.codahale.metrics.health.HealthCheckRegistry());
        config.setMetricRegistry(new com.codahale.metrics.MetricRegistry());
        
        return new HikariDataSource(config);
    }

    /**
     * Configures JPA entity manager with Hibernate as provider and custom settings
     * @param dataSource Configured datasource
     * @return Configured entity manager factory
     */
    @Bean
    public LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(dataSource);
        em.setPackagesToScan("com.linkedin.search.model");

        HibernateJpaVendorAdapter vendorAdapter = new HibernateJpaVendorAdapter();
        vendorAdapter.setGenerateDdl(false);
        vendorAdapter.setShowSql(false);
        em.setJpaVendorAdapter(vendorAdapter);

        Properties properties = new Properties();
        // PostgreSQL specific settings
        properties.setProperty("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
        properties.setProperty("hibernate.temp.use_jdbc_metadata_defaults", "false");
        
        // Performance settings
        properties.setProperty("hibernate.jdbc.batch_size", "50");
        properties.setProperty("hibernate.order_inserts", "true");
        properties.setProperty("hibernate.order_updates", "true");
        properties.setProperty("hibernate.jdbc.batch_versioned_data", "true");
        
        // Second level cache settings
        properties.setProperty("hibernate.cache.use_second_level_cache", "true");
        properties.setProperty("hibernate.cache.region.factory_class", 
            "org.hibernate.cache.ehcache.EhCacheRegionFactory");
        
        // Statistics and monitoring
        properties.setProperty("hibernate.generate_statistics", "true");
        properties.setProperty("hibernate.session.events.log", "false");
        
        // Validation settings
        properties.setProperty("hibernate.validator.apply_to_ddl", "true");
        properties.setProperty("hibernate.check_nullability", "true");

        em.setJpaProperties(properties);
        return em;
    }

    /**
     * Configures transaction management with timeout and retry settings
     * @param entityManagerFactory Configured entity manager factory
     * @return Configured transaction manager
     */
    @Bean
    public PlatformTransactionManager transactionManager(EntityManagerFactory entityManagerFactory) {
        JpaTransactionManager transactionManager = new JpaTransactionManager();
        transactionManager.setEntityManagerFactory(entityManagerFactory);
        
        // Configure transaction timeout
        transactionManager.setDefaultTimeout(30); // 30 seconds
        
        // Enable transaction synchronization
        transactionManager.setNestedTransactionAllowed(true);
        transactionManager.setValidateExistingTransaction(true);
        
        // Configure rollback rules
        transactionManager.setRollbackOnCommitFailure(true);
        
        return transactionManager;
    }
}