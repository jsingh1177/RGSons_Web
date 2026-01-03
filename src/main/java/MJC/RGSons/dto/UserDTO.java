package MJC.RGSons.dto;

public class UserDTO {
    private String id;
    private String userName;
    private String role;
    private Boolean status;
    
    // Default constructor
    public UserDTO() {}
    
    // Constructor with parameters
    public UserDTO(String id, String userName, String role, Boolean status) {
        this.id = id;
        this.userName = userName;
        this.role = role;
        this.status = status;
    }
    
    // Getters and Setters
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getUserName() {
        return userName;
    }
    
    public void setUserName(String userName) {
        this.userName = userName;
    }
    
    public String getRole() {
        return role;
    }
    
    public void setRole(String role) {
        this.role = role;
    }
    
    public Boolean getStatus() {
        return status;
    }
    
    public void setStatus(Boolean status) {
        this.status = status;
    }
}