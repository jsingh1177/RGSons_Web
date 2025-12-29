package MJC.RGSons.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloWorldController {
    
    // Simple Hello World endpoint
    @GetMapping("/hello")
    public String hello() {
        System.out.println("test");
        return "Hello World!";
    }
    
    // Hello World with parameter
    @GetMapping("/hello/name")
    public String helloWithName(@RequestParam(defaultValue = "World") String name) {
        return "Hello " + name + "!";
    }
    
    // JSON response
    @GetMapping("/hello/json")
    public HelloResponse helloJson(@RequestParam(defaultValue = "World") String name) {
        return new HelloResponse("Hello " + name + "!", System.currentTimeMillis());
    }
    
    // Inner class for JSON response
    public static class HelloResponse {
        private String message;
        private long timestamp;
        
        public HelloResponse(String message, long timestamp) {
            this.message = message;
            this.timestamp = timestamp;
        }
        
        public String getMessage() {
            return message;
        }
        
        public void setMessage(String message) {
            this.message = message;
        }
        
        public long getTimestamp() {
            return timestamp;
        }
        
        public void setTimestamp(long timestamp) {
            this.timestamp = timestamp;
        }
    }
}