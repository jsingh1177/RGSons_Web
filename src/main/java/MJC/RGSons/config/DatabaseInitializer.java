package MJC.RGSons.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Configuration
public class DatabaseInitializer {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseInitializer.class);

    @Bean
    public CommandLineRunner initDatabase(JdbcTemplate jdbcTemplate) {
        return args -> {
            logger.info("Initializing database sequence...");
            try {
                String sql = "IF NOT EXISTS (SELECT * FROM sys.sequences WHERE name = 'Master_SEQ') " +
                             "BEGIN " +
                             "CREATE SEQUENCE dbo.Master_SEQ " +
                             "AS INT " +
                             "START WITH 10000 " +
                             "INCREMENT BY 1 " +
                             "MINVALUE 10000 " +
                             "MAXVALUE 999999 " +
                             "NO CYCLE " +
                             "END";
                jdbcTemplate.execute(sql);
                logger.info("Database sequence Master_SEQ checked/created successfully.");
            } catch (Exception e) {
                logger.error("Error creating database sequence: ", e);
            }
        };
    }
}
