package MJC.RGSons.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Autowired(required = false)
    private Environment environment;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("*") // Allow all origins (localhost, azure, etc.)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH")
                .allowedHeaders("*")
                .allowCredentials(false); // Must be false if allowedOrigins is "*"
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        boolean isDev = false;
        if (environment != null) {
            try {
                isDev = Arrays.asList(environment.getActiveProfiles()).contains("dev");
            } catch (Exception ignored) {}
        }

        if (isDev) {
            registry.addResourceHandler("/**")
                    .addResourceLocations(
                            "classpath:/static/",
                            "file:./frontend/build/"
                    );
        } else {
            registry.addResourceHandler("/**")
                    .addResourceLocations(
                            "classpath:/static/"
                    );
        }
    }
}
