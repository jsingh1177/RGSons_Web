package MJC.RGSons.exception;

import org.apache.catalina.connector.ClientAbortException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResourceFoundException(org.springframework.web.servlet.resource.NoResourceFoundException ex) {
        // Just return 404 without logging stack trace
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    @ExceptionHandler(ClientAbortException.class)
    public ResponseEntity<Void> handleClientAbortException(ClientAbortException ex) {
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(org.springframework.web.bind.MethodArgumentNotValidException ex) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        
        StringBuilder errors = new StringBuilder();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String errorMessage = error.getDefaultMessage();
            errors.append(errorMessage).append("; ");
        });
        
        response.put("message", "Validation failed: " + errors.toString());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);

        String rawMessage = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        String message = rawMessage != null ? rawMessage : "Data integrity violation";
        String lower = message.toLowerCase();

        if (lower.contains("uk_ledger_map") || lower.contains("ledger_map")) {
            response.put("message", "Ledger mapping already exists for the selected Ledger, Type and Screen. Please edit the existing mapping.");
        } else if (lower.contains("duplicate") || lower.contains("unique")) {
            response.put("message", "Duplicate entry. Please use different values.");
        } else {
            response.put("message", "Unable to save due to data constraints.");
        }

        response.put("error", ex.getClass().getSimpleName());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGlobalException(Exception ex, WebRequest request) {
        System.out.println("GlobalExceptionHandler caught exception: " + ex.getMessage());
        ex.printStackTrace(); // Print stack trace to console
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", ex.getMessage());
        response.put("error", ex.getClass().getSimpleName());
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
