package MJC.RGSons.repository;

import MJC.RGSons.model.ReportFilterMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportFilterMappingRepository extends JpaRepository<ReportFilterMapping, Integer> {
    List<ReportFilterMapping> findByReportIdOrderBySortOrderAscIdAsc(Integer reportId);
    List<ReportFilterMapping> findByReportIdAndActiveTrueOrderBySortOrderAscIdAsc(Integer reportId);
    boolean existsByReportIdAndFilterNameIgnoreCase(Integer reportId, String filterName);
}
