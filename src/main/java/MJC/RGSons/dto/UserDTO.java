package MJC.RGSons.dto;

public class UserDTO {
    private Integer id;
    private String userName;
    private String role;
    private Boolean status;
    private String mobile;
    private String email;
    private String storeType;
    
    // Default constructor
    public UserDTO() {}
    
    // Constructor with parameters
    public UserDTO(Integer id, String userName, String role, Boolean status) {
        this.id = id;
        this.userName = userName;
        this.role = role;
        this.status = status;
    }

    public UserDTO(Integer id, String userName, String role, Boolean status, String mobile, String email) {
        this.id = id;
        this.userName = userName;
        this.role = role;
        this.status = status;
        this.mobile = mobile;
        this.email = email;
    }

    public UserDTO(Integer id, String userName, String role, Boolean status, String mobile, String email, String storeType) {
        this.id = id;
        this.userName = userName;
        this.role = role;
        this.status = status;
        this.mobile = mobile;
        this.email = email;
        this.storeType = storeType;
    }
    
    // Getters and Setters
    public Integer getId() {
        return id;
    }
    
    public void setId(Integer id) {
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
    
    public String getMobile() {
        return mobile;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getStoreType() {
        return storeType;
    }

    public void setStoreType(String storeType) {
        this.storeType = storeType;
    }
}