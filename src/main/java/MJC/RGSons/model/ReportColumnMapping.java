package MJC.RGSons.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "Report_Column_Config")
public class ReportColumnMapping {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "report_id")
    private Integer reportId;

    @Column(name = "column_name")
    private String columnName;

    @Column(name = "label")
    private String columnHeader;

    @Column(name = "data_type")
    private String dataType;

    @Column(name = "width")
    private Integer width;

    @Column(name = "visible")
    private Boolean visible;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "update_at")
    private LocalDateTime updateAt;

    public ReportColumnMapping() {
        this.createdAt = LocalDateTime.now();
        this.updateAt = LocalDateTime.now();
        if (this.visible == null) {
            this.visible = true;
        }
        if (this.sortOrder == null) {
            this.sortOrder = 0;
        }
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getReportId() { return reportId; }
    public void setReportId(Integer reportId) { this.reportId = reportId; }

    public String getColumnName() { return columnName; }
    public void setColumnName(String columnName) { this.columnName = columnName; }

    public String getColumnHeader() { return columnHeader; }
    public void setColumnHeader(String columnHeader) { this.columnHeader = columnHeader; }

    public String getDataType() { return dataType; }
    public void setDataType(String dataType) { this.dataType = dataType; }

    public Integer getWidth() { return width; }
    public void setWidth(Integer width) { this.width = width; }

    public Boolean getVisible() { return visible; }
    public void setVisible(Boolean visible) { this.visible = visible; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdateAt() { return updateAt; }
    public void setUpdateAt(LocalDateTime updateAt) { this.updateAt = updateAt; }
}
