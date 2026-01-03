package MJC.RGSons.repository;

import MJC.RGSons.model.Users;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<Users, String> {
    
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
    @Query(value = "{ 'role': ?0, 'status': true }", sort = "{ 'createdAt': -1 }")
    List<Users> findActiveUsersByRole(String role);
    
    // Count users by role
    @Query(value = "{ 'role': ?0 }", count = true)
    long countUsersByRole(String role);
    
    // Find users created after a certain date
    @Query(value = "{ 'createdAt': { $gte: ?0 } }", sort = "{ 'createdAt': -1 }")
    List<Users> findUsersCreatedAfter(java.time.LocalDateTime date);
}