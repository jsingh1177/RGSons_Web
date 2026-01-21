package MJC.RGSons.controller;

import MJC.RGSons.model.Store;
import MJC.RGSons.model.UserStoreMap;
import MJC.RGSons.repository.StoreRepository;
import MJC.RGSons.repository.UserStoreMapRepository;
import MJC.RGSons.dto.UserDTO;
import MJC.RGSons.model.Users;
import MJC.RGSons.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class UserAuthController {
    
    @Autowired
    private UserService userService;

    @Autowired
    private UserStoreMapRepository userStoreMapRepository;

    @Autowired
    private StoreRepository storeRepository;
    
    // User registration
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> registerUser(@Valid @RequestBody Users user) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check if username already exists
            if (userService.usernameExists(user.getUserName())) {
                response.put("success", false);
                response.put("message", "Username already exists");
                return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
            }
            
            // Set default values if not provided
            if (user.getRole() == null || user.getRole().isEmpty()) {
                user.setRole("USER");
            }
            if (user.getStatus() == null) {
                user.setStatus(true);
            }
            
            Users createdUser = userService.createUser(user);
            
            response.put("success", true);
            response.put("message", "User registered successfully");
            response.put("userId", createdUser.getId());
            response.put("userName", createdUser.getUserName());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Registration failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // User login
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> loginUser(@RequestBody Map<String, String> loginRequest) {
        Map<String, Object> response = new HashMap<>();
       
        try {
            String userName = loginRequest.get("userName");
            String password = loginRequest.get("password");
            System.out.println("Login request received for userName: " + userName);
            if (userName == null || password == null) {
                response.put("success", false);
                response.put("message", "Username and password are required");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
            
            Optional<Users> authenticatedUser = userService.authenticateUser(userName, password);
            
            if (authenticatedUser.isPresent()) {
                Users user = authenticatedUser.get();
                
                String storeType = null;
                List<UserStoreMap> maps = userStoreMapRepository.findByUserName(user.getUserName());
                if (!maps.isEmpty()) {
                    String storeCode = maps.get(0).getStoreCode();
                    Optional<Store> storeOpt = storeRepository.findByStoreCode(storeCode);
                    if (storeOpt.isPresent()) {
                        storeType = storeOpt.get().getStoreType();
                    }
                }

                UserDTO userDTO = new UserDTO(user.getId(), user.getUserName(), user.getRole(), user.getStatus(), storeType);
                response.put("success", true);
                response.put("message", "Login successful");
                response.put("user", userDTO);
                
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Invalid username or password");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Login failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Reset password
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@RequestBody Map<String, String> body) {
        Map<String, Object> response = new HashMap<>();
        try {
            String userName = body.get("userName");
            String oldPassword = body.get("oldPassword");
            String newPassword = body.get("newPassword");
            if (userName == null || oldPassword == null || newPassword == null) {
                response.put("success", false);
                response.put("message", "userName, oldPassword and newPassword are required");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
            boolean ok = userService.resetPassword(userName, oldPassword, newPassword);
            if (ok) {
                response.put("success", true);
                response.put("message", "Password reset successful");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Invalid username or old password");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Password reset failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get all users (admin only) - returns limited fields
    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> getAllUsers() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<UserDTO> users = userService.getAllUsersDTO();
            response.put("success", true);
            response.put("users", users);
            response.put("count", users.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to retrieve users: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get user by ID - returns limited fields
    @GetMapping("/users/{id}")
    public ResponseEntity<Map<String, Object>> getUserById(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Optional<UserDTO> user = userService.getUserByIdDTO(id);
            
            if (user.isPresent()) {
                response.put("success", true);
                response.put("user", user.get());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "User not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to retrieve user: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get users by role - returns limited fields
    @GetMapping("/users/role/{role}")
    public ResponseEntity<Map<String, Object>> getUsersByRole(@PathVariable String role) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<UserDTO> users = userService.getUsersByRoleDTO(role);
            response.put("success", true);
            response.put("users", users);
            response.put("count", users.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to retrieve users: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Update user
    @PutMapping("/users/{id}")
    public ResponseEntity<Map<String, Object>> updateUser(@PathVariable String id, @Valid @RequestBody Users user) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Users updatedUser = userService.updateUser(id, user);
            
            if (updatedUser != null) {
                response.put("success", true);
                response.put("message", "User updated successfully");
                response.put("user", updatedUser);
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "User not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to update user: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Deactivate user
    @PutMapping("/users/{id}/deactivate")
    public ResponseEntity<Map<String, Object>> deactivateUser(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            boolean success = userService.deactivateUser(id);
            
            if (success) {
                response.put("success", true);
                response.put("message", "User deactivated successfully");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "User not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to deactivate user: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Activate user
    @PutMapping("/users/{id}/activate")
    public ResponseEntity<Map<String, Object>> activateUser(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            boolean success = userService.activateUser(id);
            
            if (success) {
                response.put("success", true);
                response.put("message", "User activated successfully");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "User not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to activate user: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Delete user
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Map<String, Object>> deleteUser(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            boolean success = userService.deleteUser(id);
            
            if (success) {
                response.put("success", true);
                response.put("message", "User deleted successfully");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "User not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to delete user: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Check username availability
    @GetMapping("/check-username/{userName}")
    public ResponseEntity<Map<String, Object>> checkUsername(@PathVariable String userName) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            boolean exists = userService.usernameExists(userName);
            response.put("success", true);
            response.put("available", !exists);
            response.put("message", exists ? "Username already taken" : "Username available");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to check username: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
