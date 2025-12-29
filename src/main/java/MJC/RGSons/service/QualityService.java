package MJC.RGSons.service;

import MJC.RGSons.model.Quality;
import MJC.RGSons.repository.QualityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class QualityService {
    
    @Autowired
    private QualityRepository qualityRepository;
    
    public List<Quality> getAllQualities() {
        return qualityRepository.findAll();
    }
    
    public Optional<Quality> getQualityById(Long id) {
        return qualityRepository.findById(id);
    }
    
    public Optional<Quality> getQualityByCode(String code) {
        return qualityRepository.findByQualityCode(code);
    }
    
    public List<Quality> getActiveQualities() {
        return qualityRepository.findByStatus(true);
    }
    
    public List<Quality> getQualitiesByStatus(Boolean status) {
        return qualityRepository.findByStatus(status);
    }
    
    public void validateQuality(Quality quality) {
        if (quality.getQualityCode() == null || quality.getQualityCode().trim().isEmpty()) {
            throw new RuntimeException("Quality code is required");
        }
        if (quality.getQualityName() == null || quality.getQualityName().trim().isEmpty()) {
            throw new RuntimeException("Quality name is required");
        }
    }
    
    public Quality createQuality(Quality quality) {
        if (qualityRepository.existsByQualityCode(quality.getQualityCode())) {
            throw new RuntimeException("Quality code already exists: " + quality.getQualityCode());
        }
        
        if (quality.getStatus() == null) {
            quality.setStatus(true);
        }
        quality.setCreatedAt(LocalDateTime.now());
        quality.setUpdateAt(LocalDateTime.now());
        
        return qualityRepository.save(quality);
    }
    
    public Quality updateQuality(Long id, Quality qualityDetails) {
        Optional<Quality> optionalQuality = qualityRepository.findById(id);
        if (optionalQuality.isPresent()) {
            Quality existingQuality = optionalQuality.get();
            
            // Check if code is changing and if it exists
            if (!existingQuality.getQualityCode().equals(qualityDetails.getQualityCode()) && 
                qualityRepository.existsByQualityCode(qualityDetails.getQualityCode())) {
                throw new RuntimeException("Quality code already exists: " + qualityDetails.getQualityCode());
            }
            
            existingQuality.setQualityCode(qualityDetails.getQualityCode());
            existingQuality.setQualityName(qualityDetails.getQualityName());
            if (qualityDetails.getStatus() != null) {
                existingQuality.setStatus(qualityDetails.getStatus());
            }
            existingQuality.setUpdateAt(LocalDateTime.now());
            
            return qualityRepository.save(existingQuality);
        } else {
            throw new RuntimeException("Quality not found with id: " + id);
        }
    }
    
    public void deleteQualityById(Long id) {
        // Soft delete implementation
        Optional<Quality> optionalQuality = qualityRepository.findById(id);
        if (optionalQuality.isPresent()) {
            Quality quality = optionalQuality.get();
            quality.setStatus(false);
            quality.setUpdateAt(LocalDateTime.now());
            qualityRepository.save(quality);
        } else {
            throw new RuntimeException("Quality not found with id: " + id);
        }
    }
    
    public void hardDeleteQualityById(Long id) {
        if (qualityRepository.existsById(id)) {
            qualityRepository.deleteById(id);
        } else {
            throw new RuntimeException("Quality not found with id: " + id);
        }
    }
    
    public List<Quality> searchQualities(String name, Boolean status) {
        return qualityRepository.findByNameAndStatus(name, status);
    }
    
    public boolean existsByCode(String code) {
        return qualityRepository.existsByQualityCode(code);
    }
}
