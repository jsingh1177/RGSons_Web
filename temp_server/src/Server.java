import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.OutputStream;
import java.io.File;
import java.nio.file.Files;
import java.net.InetSocketAddress;

public class Server {

    public static void main(String[] args) throws IOException {
        int port = 8080;
        // Create an HttpServer instance bound to port 8080
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);

        // 1. Context for serving static files (root path "/")
        // This handles requests like /, /index.html, /style.css, etc.
        server.createContext("/", new StaticFileHandler());
        
        // 2. Context for the status endpoint ("/status")
        // Returns a simple JSON response
        server.createContext("/status", new StatusHandler());

        // Default executor
        server.setExecutor(null); 
        
        System.out.println("========================================");
        System.out.println("Java Simple Server Started");
        System.out.println("Port: " + port);
        System.out.println("Root URL: http://localhost:" + port + "/");
        System.out.println("Status URL: http://localhost:" + port + "/status");
        System.out.println("Serving files from: ./public");
        System.out.println("========================================");
        
        server.start();
    }

    // Handler for the /status endpoint
    static class StatusHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange t) throws IOException {
            String response = "{\"status\": \"running\", \"message\": \"Server is operational\"}";
            
            // Set Content-Type header to application/json
            t.getResponseHeaders().set("Content-Type", "application/json");
            
            // Send HTTP 200 OK status and response length
            t.sendResponseHeaders(200, response.length());
            
            // Write the response body
            OutputStream os = t.getResponseBody();
            os.write(response.getBytes());
            os.close();
            
            System.out.println("[Request] /status - 200 OK");
        }
    }

    // Handler for serving static files from the "public" folder
    static class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange t) throws IOException {
            // Assume we are running from the folder containing the "public" directory
            String root = "public";
            String path = t.getRequestURI().getPath();
            
            // Default to index.html if root is requested
            if (path.equals("/")) {
                path = "/index.html";
            }

            // Create a File object for the requested resource
            File file = new File(root + path).getCanonicalFile();
            File rootDir = new File(root).getCanonicalFile();

            // Security Check: Prevent directory traversal attacks
            // Ensure the requested file is actually inside the "public" folder
            if (!file.getPath().startsWith(rootDir.getPath())) {
                String response = "403 (Forbidden)";
                t.sendResponseHeaders(403, response.length());
                OutputStream os = t.getResponseBody();
                os.write(response.getBytes());
                os.close();
                System.out.println("[Error] 403 Forbidden: " + path);
                return;
            }

            if (!file.isFile()) {
                // File not found
                String response = "404 (Not Found)";
                t.sendResponseHeaders(404, response.length());
                OutputStream os = t.getResponseBody();
                os.write(response.getBytes());
                os.close();
                System.out.println("[Error] 404 Not Found: " + path);
            } else {
                // Determine MIME type based on file extension
                String mime = "text/plain";
                if (path.endsWith(".html")) mime = "text/html";
                else if (path.endsWith(".css")) mime = "text/css";
                else if (path.endsWith(".js")) mime = "application/javascript";
                else if (path.endsWith(".json")) mime = "application/json";
                else if (path.endsWith(".png")) mime = "image/png";
                else if (path.endsWith(".jpg") || path.endsWith(".jpeg")) mime = "image/jpeg";
                
                t.getResponseHeaders().set("Content-Type", mime);
                t.sendResponseHeaders(200, file.length());
                
                // Stream the file content to the response body
                OutputStream os = t.getResponseBody();
                Files.copy(file.toPath(), os);
                os.close();
                
                System.out.println("[Request] " + path + " - 200 OK (" + mime + ")");
            }
        }
    }
}
