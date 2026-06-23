package MJC.RGSons.repository;

import MJC.RGSons.model.ReportMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReportMasterRepository extends JpaRepository<ReportMaster, Integer> {
    boolean existsByReportNameIgnoreCase(String reportName);
    List<ReportMaster> findByActiveTrueOrderByReportNameAsc();
    Optional<ReportMaster> findByIdAndActiveTrue(Integer id);
}
