package MJC.RGSons.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.util.StringUtils;
import org.springframework.lang.NonNull;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Autowired(required = false)
    private Environment environment;

    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        List<String> allowedOrigins = getAllowedOrigins();
        registry.addMapping("/**")
                .allowedOrigins(allowedOrigins.toArray(String[]::new))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH")
                .allowedHeaders("*")
                .allowCredentials(false);
    }

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        boolean isDev = false;
        if (environment != null) {
            try {
                isDev = Arrays.asList(environment.getActiveProfiles()).contains("dev");
            } catch (Exception ignored) {}
        }

        CacheControl noCache = CacheControl.noCache().cachePrivate().mustRevalidate();
        CacheControl staticCache = CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable();

        if (isDev) {
            registry.addResourceHandler("/static/**")
                    .addResourceLocations(
                            "file:./frontend/build/static/"
                            , "classpath:/static/static/"
                    )
                    .setCacheControl(noCache);

            registry.addResourceHandler("/", "/index.html", "/asset-manifest.json", "/manifest.json", "/favicon.ico")
                    .addResourceLocations(
                            "file:./frontend/build/"
                            , "classpath:/static/"
                    )
                    .setCacheControl(noCache);

            registry.addResourceHandler("/**")
                    .addResourceLocations(
                            "file:./frontend/build/"
                            , "classpath:/static/"
                    )
                    .setCacheControl(noCache);
        } else {
            registry.addResourceHandler("/static/**")
                    .addResourceLocations(
                            "classpath:/static/static/"
                    )
                    .setCacheControl(staticCache);

            registry.addResourceHandler("/", "/index.html", "/asset-manifest.json", "/manifest.json", "/favicon.ico")
                    .addResourceLocations(
                            "classpath:/static/"
                    )
                    .setCacheControl(noCache);

            registry.addResourceHandler("/**")
                    .addResourceLocations(
                            "classpath:/static/"
                    )
                    .setCacheControl(noCache);
        }
    }

    private List<String> getAllowedOrigins() {
        String configuredOrigins = environment != null
                ? environment.getProperty("app.cors.allowed-origins", "")
                : "";

        List<String> origins = Arrays.stream(configuredOrigins.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .distinct()
                .toList();

        if (!origins.isEmpty()) {
            return origins;
        }

        return List.of(
                "http://localhost:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:3001"
        );
    }
}
