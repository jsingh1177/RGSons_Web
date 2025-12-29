package MJC.RGSons.repository;

import MJC.RGSons.model.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<Users, Long> {
    
    // Find user by username
    Optional<Users> findByUserName(String userName);
    
    // Find user by username and password (for authentication)
    Optional<Users> findByUserNameAndPassword(String userName, String password);
    
    // Find users by role
    List<Users> findByRole(String role);
    
    // Find users by status
    List<Users> findByStatus(Boolean status);
    
    // Find active users by role
    List<Users> findByRoleAndStatus(String role, Boolean status);
    
    // Check if username exists
    boolean existsByUserName(String userName);
    
    // Find users by role with custom query
    @Query("SELECT u FROM Users u WHERE u.role = :role AND u.status = true ORDER BY u.createdAt DESC")
    List<Users> findActiveUsersByRole(@Param("role") String role);
    
    // Count users by role
    @Query("SELECT COUNT(u) FROM Users u WHERE u.role = :role")
    long countUsersByRole(@Param("role") String role);
    
    // Find users created after a certain date
    @Query("SELECT u FROM Users u WHERE u.createdAt >= :date ORDER BY u.createdAt DESC")
    List<Users> findUsersCreatedAfter(@Param("date") java.time.LocalDateTime date);
}