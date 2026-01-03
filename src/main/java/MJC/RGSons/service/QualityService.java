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

    @Autowired
    private SequenceGeneratorService sequenceGeneratorService;
    
    public List<Quality> getAllQualities() {
        return qualityRepository.findAll();
    }
    
    public Optional<Quality> getQualityById(String id) {
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
        // Code validation removed as it is auto-generated if missing
        /*
        if (quality.getQualityCode() == null || quality.getQualityCode().trim().isEmpty()) {
            throw new RuntimeException("Quality code is required");
        }
        */
        if (quality.getQualityName() == null || quality.getQualityName().trim().isEmpty()) {
            throw new RuntimeException("Quality name is required");
        }
    }
    
    public Quality createQuality(Quality quality) {
        // Auto-generate quality code
        if (quality.getQualityCode() == null || quality.getQualityCode().trim().isEmpty()) {
            quality.setQualityCode(sequenceGeneratorService.generateSequence("Master_SEQ"));
        }

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
    
    public Quality updateQuality(String id, Quality qualityDetails) {
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
    
    public void deleteQualityById(String id) {
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
    
    public void hardDeleteQualityById(String id) {
        if (qualityRepository.existsById(id)) {
            qualityRepository.deleteById(id);
        } else {
            throw new RuntimeException("Quality not found with id: " + id);
        }
    }
    
    public List<Quality> searchQualities(String name, Boolean status) {
        if (name != null && status != null) {
            return qualityRepository.findByQualityNameContainingIgnoreCaseAndStatus(name, status);
        } else if (name != null) {
            return qualityRepository.findByQualityNameContainingIgnoreCase(name);
        } else if (status != null) {
            return qualityRepository.findByStatus(status);
        } else {
            return qualityRepository.findAll();
        }
    }
    
    public boolean existsByCode(String code) {
        return qualityRepository.existsByQualityCode(code);
    }
}
