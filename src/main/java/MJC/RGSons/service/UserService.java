package MJC.RGSons.service;

import MJC.RGSons.dto.UserDTO;
import MJC.RGSons.model.Users;
import MJC.RGSons.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    // Create a new user
    public Users createUser(Users user) {
        // Generate salt and hash password
        String salt = generateSalt();
        String hashedPassword = hashPassword(user.getPassword(), salt);
        
        user.setSalt(salt);
        user.setPassword(hashedPassword);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdateAt(LocalDateTime.now());
        
        return userRepository.save(user);
    }
    
    // Authenticate user
    public Optional<Users> authenticateUser(String userName, String password) {
        Optional<Users> userOpt = userRepository.findByUserName(userName);
        
        if (userOpt.isPresent()) {
            Users user = userOpt.get();
            String hashedPassword = hashPassword(password, user.getSalt());
            
            if (hashedPassword.equals(user.getPassword()) && user.getStatus()) {
                return Optional.of(user);
            }
        }
        
        return Optional.empty();
    }
    
    // Get all users
    public List<Users> getAllUsers() {
        return userRepository.findAll();
    }
    
    // Get all users as DTO (limited fields)
    public List<UserDTO> getAllUsersDTO() {
        return userRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(java.util.stream.Collectors.toList());
    }
    
    // Get user by ID
    public Optional<Users> getUserById(Long id) {
        return userRepository.findById(id);
    }
    
    // Get user by ID as DTO (limited fields)
    public Optional<UserDTO> getUserByIdDTO(Long id) {
        return userRepository.findById(id)
                .map(this::convertToDTO);
    }
    
    // Get user by username
    public Optional<Users> getUserByUserName(String userName) {
        return userRepository.findByUserName(userName);
    }
    
    // Get users by role
    public List<Users> getUsersByRole(String role) {
        return userRepository.findByRole(role);
    }
    
    // Get users by role as DTO (limited fields)
    public List<UserDTO> getUsersByRoleDTO(String role) {
        return userRepository.findByRole(role).stream()
                .map(this::convertToDTO)
                .collect(java.util.stream.Collectors.toList());
    }
    
    // Get active users
    public List<Users> getActiveUsers() {
        return userRepository.findByStatus(true);
    }
    
    // Get active users as DTO (limited fields)
    public List<UserDTO> getActiveUsersDTO() {
        return userRepository.findByStatus(true).stream()
                .map(this::convertToDTO)
                .collect(java.util.stream.Collectors.toList());
    }
    
    // Get active users by role
    public List<Users> getActiveUsersByRole(String role) {
        return userRepository.findActiveUsersByRole(role);
    }
    
    // Get active users by role as DTO (limited fields)
    public List<UserDTO> getActiveUsersByRoleDTO(String role) {
        return userRepository.findActiveUsersByRole(role).stream()
                .map(this::convertToDTO)
                .collect(java.util.stream.Collectors.toList());
    }
    
    // Update user
    public Users updateUser(Long id, Users updatedUser) {
        Optional<Users> existingUserOpt = userRepository.findById(id);
        
        if (existingUserOpt.isPresent()) {
            Users existingUser = existingUserOpt.get();
            
            existingUser.setUserName(updatedUser.getUserName());
            existingUser.setRole(updatedUser.getRole());
            existingUser.setStatus(updatedUser.getStatus());
            existingUser.setUpdateAt(LocalDateTime.now());
            
            // Only update password if provided
            if (updatedUser.getPassword() != null && !updatedUser.getPassword().isEmpty()) {
                String salt = generateSalt();
                String hashedPassword = hashPassword(updatedUser.getPassword(), salt);
                existingUser.setSalt(salt);
                existingUser.setPassword(hashedPassword);
            }
            
            return userRepository.save(existingUser);
        }
        
        return null;
    }
    
    // Delete user
    public boolean deleteUser(Long id) {
        if (userRepository.existsById(id)) {
            userRepository.deleteById(id);
            return true;
        }
        return false;
    }
    
    // Deactivate user (soft delete)
    public boolean deactivateUser(Long id) {
        Optional<Users> userOpt = userRepository.findById(id);
        
        if (userOpt.isPresent()) {
            Users user = userOpt.get();
            user.setStatus(false);
            user.setUpdateAt(LocalDateTime.now());
            userRepository.save(user);
            return true;
        }
        
        return false;
    }
    
    // Activate user
    public boolean activateUser(Long id) {
        Optional<Users> userOpt = userRepository.findById(id);
        
        if (userOpt.isPresent()) {
            Users user = userOpt.get();
            user.setStatus(true);
            user.setUpdateAt(LocalDateTime.now());
            userRepository.save(user);
            return true;
        }
        
        return false;
    }
    
    // Check if username exists
    public boolean usernameExists(String userName) {
        return userRepository.existsByUserName(userName);
    }
    
    // Count users by role
    public long countUsersByRole(String role) {
        return userRepository.countUsersByRole(role);
    }
    
    // Get users created after date
    public List<Users> getUsersCreatedAfter(LocalDateTime date) {
        return userRepository.findUsersCreatedAfter(date);
    }
    
    // Reset password
    public boolean resetPassword(String userName, String oldPassword, String newPassword) {
        Optional<Users> userOpt = userRepository.findByUserName(userName);
        
        if (userOpt.isPresent()) {
            Users user = userOpt.get();
            String hashedOldPassword = hashPassword(oldPassword, user.getSalt());
            
            if (hashedOldPassword.equals(user.getPassword())) {
                String newSalt = generateSalt();
                String hashedNewPassword = hashPassword(newPassword, newSalt);
                
                user.setSalt(newSalt);
                user.setPassword(hashedNewPassword);
                user.setUpdateAt(LocalDateTime.now());
                
                userRepository.save(user);
                return true;
            }
        }
        return false;
    }

    // Generate salt for password hashing
    private String generateSalt() {
        SecureRandom random = new SecureRandom();
        byte[] salt = new byte[16];
        random.nextBytes(salt);
        return Base64.getEncoder().encodeToString(salt);
    }
    
    // Hash password with salt
    private String hashPassword(String password, String salt) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(Base64.getDecoder().decode(salt));
            byte[] hashedPassword = md.digest(password.getBytes());
            return Base64.getEncoder().encodeToString(hashedPassword);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Error hashing password", e);
        }
    }
    
    // Convert User entity to UserDTO
    private UserDTO convertToDTO(Users user) {
        return new UserDTO(
            user.getId(),
            user.getUserName(),
            user.getRole(),
            user.getStatus()
        );
    }
}