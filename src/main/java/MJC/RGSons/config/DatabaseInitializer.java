package MJC.RGSons.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import MJC.RGSons.service.UserService;
import MJC.RGSons.model.Users;
import java.util.Optional;

@Configuration
@Profile("!prod")
public class DatabaseInitializer {

    @Bean
    public CommandLineRunner addStoreInfoColumns(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                jdbcTemplate.execute("IF COL_LENGTH('store','info1') IS NULL ALTER TABLE store ADD info1 VARCHAR(255)");
                jdbcTemplate.execute("IF COL_LENGTH('store','info2') IS NULL ALTER TABLE store ADD info2 VARCHAR(255)");
                jdbcTemplate.execute("IF COL_LENGTH('store','info3') IS NULL ALTER TABLE store ADD info3 VARCHAR(255)");
            } catch (Exception e) {
                System.out.println("Error adding columns: " + e.getMessage());
            }
        };
    }

    @Bean
    public CommandLineRunner initUsers(UserService userService) {
        return args -> {
            try {
                if (!userService.usernameExists("admin")) {
                    Users admin = new Users();
                    admin.setUserName("admin");
                    admin.setPassword("admin123");
                    admin.setRole("ADMIN");
                    admin.setStatus(true);
                    admin.setMobile("1234567890");
                    admin.setEmail("admin@rgsons.com");
                    userService.createUser(admin);
                    System.out.println("Admin user created: admin / admin123");
                } else {
                    // Reset password to ensure it works
                    Optional<Users> adminOpt = userService.getUserByUserName("admin");
                    if (adminOpt.isPresent()) {
                        Users admin = adminOpt.get();
                        Users updateRequest = new Users();
                        updateRequest.setUserName(admin.getUserName());
                        updateRequest.setRole(admin.getRole());
                        updateRequest.setStatus(admin.getStatus());
                        updateRequest.setMobile(admin.getMobile());
                        updateRequest.setEmail(admin.getEmail());
                        updateRequest.setPassword("admin123");
                        userService.updateUser(admin.getId(), updateRequest);
                        System.out.println("Admin user password reset to: admin123");
                    }
                }
            } catch (Exception e) {
                System.out.println("Error initializing users: " + e.getMessage());
            }
        };
    }
}
