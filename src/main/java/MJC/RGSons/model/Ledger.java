package MJC.RGSons.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "ledgers")
public class Ledger {

    @Id
    @UuidGenerator
    private String id;

    @Column(name = "code")
    private String code;

    @Column(name = "name")
    private String name;

    @Column(name = "type")
    private String type;

    @Column(name = "screen")
    private String screen;

    @Column(name = "status")
    private Integer status;

    public Ledger() {
    }

    public Ledger(String code, String name, String type, String screen, Integer status) {
        this.code = code;
        this.name = name;
        this.type = type;
        this.screen = screen;
        this.status = status;
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

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getScreen() {
        return screen;
    }

    public void setScreen(String screen) {
        this.screen = screen;
    }

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }
}
