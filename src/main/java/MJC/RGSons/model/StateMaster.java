package MJC.RGSons.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "state_master")
public class StateMaster {
    @Id
    @UuidGenerator
    private String id;

    @Column(name = "code", unique = true)
    private String code;

    @Column(name = "name")
    private String name;

    public StateMaster() {}

    public StateMaster(String code, String name) {
        this.code = code;
        this.name = name;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
