package MJC.RGSons.config;

import MJC.RGSons.RgSonsApplication;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MutablePropertySources;
import org.springframework.core.env.PropertiesPropertySource;

import java.io.FileInputStream;
import java.io.IOException;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Properties;
import java.util.Set;

public class ExternalConfigEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String PROPERTY_SOURCE_NAME = "externalConfigProperties";
    private static final String CONFIG_FILE_NAME = "config.properties";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Path configPath = resolveConfigPath();
        if (configPath == null || !Files.exists(configPath) || !Files.isRegularFile(configPath)) {
            return;
        }

        Properties properties = new Properties();
        try (FileInputStream in = new FileInputStream(configPath.toFile())) {
            properties.load(in);
        } catch (IOException ex) {
            return;
        }

        Properties effectiveProperties = buildEffectiveProperties(properties);

        MutablePropertySources sources = environment.getPropertySources();
        PropertiesPropertySource propertySource = new PropertiesPropertySource(PROPERTY_SOURCE_NAME, effectiveProperties);
        sources.addFirst(propertySource);
    }

    private Properties buildEffectiveProperties(Properties source) {
        Properties target = new Properties();

        Set<String> names = source.stringPropertyNames();
        for (String name : names) {
            if (!name.startsWith("dev.") && !name.startsWith("uat.") && !name.startsWith("prod.")) {
                target.put(name, source.getProperty(name));
            }
        }

        String env = target.getProperty("env", "prod").trim().toLowerCase();
        String prefix = env + ".";

        for (String name : names) {
            if (name.startsWith(prefix)) {
                String key = name.substring(prefix.length());
                if (!key.isEmpty()) {
                    target.put(key, source.getProperty(name));
                }
            }
        }

        if (!target.containsKey("spring.profiles.active")) {
            target.put("spring.profiles.active", env);
        }

        return target;
    }

    private Path resolveConfigPath() {
        try {
            URL location = RgSonsApplication.class.getProtectionDomain().getCodeSource().getLocation();
            Path basePath;

            if (location != null) {
                Path path = Paths.get(location.toURI());
                basePath = Files.isDirectory(path) ? path : path.getParent();
            } else {
                basePath = Paths.get(".").toAbsolutePath().normalize();
            }

            if (basePath == null) {
                basePath = Paths.get(".").toAbsolutePath().normalize();
            }

            Path candidate = basePath.resolve(CONFIG_FILE_NAME).normalize();
            if (Files.exists(candidate) && Files.isRegularFile(candidate)) {
                return candidate;
            }

            Path parent = basePath.getParent();
            if (parent != null) {
                Path parentCandidate = parent.resolve(CONFIG_FILE_NAME).normalize();
                if (Files.exists(parentCandidate) && Files.isRegularFile(parentCandidate)) {
                    return parentCandidate;
                }
            }

            return Paths.get(CONFIG_FILE_NAME).toAbsolutePath().normalize();
        } catch (URISyntaxException ex) {
            return Paths.get(CONFIG_FILE_NAME).toAbsolutePath().normalize();
        }
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }
}
