package com.studenttech.repository;

import com.studenttech.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {

    Optional<Student> findByName(String name);

    List<Student> findByNameContainingIgnoreCase(String name);

    @Query("SELECT s FROM Student s WHERE s.name LIKE %:keyword% OR s.techStacks LIKE %:keyword%")
    List<Student> searchStudents(@Param("keyword") String keyword);
}