package MJC.RGSons.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "pr_item")
public class PrItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "store_code")
    private String storeCode;

    @Column(name = "tran_date")
    private LocalDate tranDate;

    @Column(name = "invoice_no")
    private String invoiceNo;

    @Column(name = "item_code")
    private String itemCode;

    @Column(name = "size_code")
    private String sizeCode;

    @Column(name = "Org_Inv_No")
    private String orgInvNo;

    @Column(name = "Org_Inv_Date")
    private LocalDate orgInvDate;

    @Column(name = "price")
    private Double price;

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "amount")
    private Double amount;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public PrItem() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getStoreCode() { return storeCode; }
    public void setStoreCode(String storeCode) { this.storeCode = storeCode; }

    public LocalDate getTranDate() { return tranDate; }
    public void setTranDate(LocalDate tranDate) { this.tranDate = tranDate; }

    public String getInvoiceNo() { return invoiceNo; }
    public void setInvoiceNo(String invoiceNo) { this.invoiceNo = invoiceNo; }

    public String getItemCode() { return itemCode; }
    public void setItemCode(String itemCode) { this.itemCode = itemCode; }

    public String getSizeCode() { return sizeCode; }
    public void setSizeCode(String sizeCode) { this.sizeCode = sizeCode; }

    public String getOrgInvNo() { return orgInvNo; }
    public void setOrgInvNo(String orgInvNo) { this.orgInvNo = orgInvNo; }

    public LocalDate getOrgInvDate() { return orgInvDate; }
    public void setOrgInvDate(LocalDate orgInvDate) { this.orgInvDate = orgInvDate; }

    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}

