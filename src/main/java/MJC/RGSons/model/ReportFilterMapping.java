package MJC.RGSons.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "Report_Filter_Mapping")
public class ReportFilterMapping {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "report_id")
    private Integer reportId;

    @Column(name = "filter_name")
    private String filterName;

    @Column(name = "label")
    private String filterLabel;

    @Column(name = "Parameter_Name")
    private String parameterName;

    @Column(name = "control_type")
    private String type;

    @Column(name = "required")
    private Boolean required;

    @Column(name = "default_value")
    private String defaultValue;

    @Column(name = "dropdown_query", columnDefinition = "nvarchar(max)")
    private String dropdownQuery;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "active")
    private Boolean active;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "update_at")
    private LocalDateTime updateAt;

    public ReportFilterMapping() {
        this.createdAt = LocalDateTime.now();
        this.updateAt = LocalDateTime.now();
        if (this.active == null) {
            this.active = true;
        }
        if (this.required == null) {
            this.required = false;
        }
        if (this.sortOrder == null) {
            this.sortOrder = 0;
        }
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getReportId() { return reportId; }
    public void setReportId(Integer reportId) { this.reportId = reportId; }

    public String getFilterName() { return filterName; }
    public void setFilterName(String filterName) { this.filterName = filterName; }

    public String getFilterLabel() { return filterLabel; }
    public void setFilterLabel(String filterLabel) { this.filterLabel = filterLabel; }

    public String getParameterName() { return parameterName; }
    public void setParameterName(String parameterName) { this.parameterName = parameterName; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Boolean getRequired() { return required; }
    public void setRequired(Boolean required) { this.required = required; }

    public String getDefaultValue() { return defaultValue; }
    public void setDefaultValue(String defaultValue) { this.defaultValue = defaultValue; }

    public String getDropdownQuery() { return dropdownQuery; }
    public void setDropdownQuery(String dropdownQuery) { this.dropdownQuery = dropdownQuery; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdateAt() { return updateAt; }
    public void setUpdateAt(LocalDateTime updateAt) { this.updateAt = updateAt; }
}
