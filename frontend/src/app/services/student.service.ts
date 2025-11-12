import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError } from 'rxjs';
import { of } from 'rxjs';
import { Student } from '../models/student.model';

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private apiUrl = '/api/v1/students';
  private studentsSubject = new BehaviorSubject<Student[]>([]);

  constructor(private http: HttpClient) { }

  // Get all students
  getAllStudents(): Observable<Student[]> {
    return this.http.get<Student[]>(this.apiUrl).pipe(
      tap(students => this.studentsSubject.next(students)),
      catchError(error => {
        console.error('Error fetching students', error);
        return of([]);
      })
    );
  }

  // Get student by ID
  getStudentById(id: number): Observable<Student> {
    return this.http.get<Student>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => {
        console.error('Error fetching student', error);
        throw error;
      })
    );
  }

  // Add new student
  addStudent(student: Student): Observable<Student> {
    return this.http.post<Student>(this.apiUrl, student).pipe(
      tap(newStudent => {
        const currentStudents = this.studentsSubject.value;
        this.studentsSubject.next([...currentStudents, newStudent]);
      }),
      catchError(error => {
        console.error('Error adding student', error);
        throw error;
      })
    );
  }

  // Update student
  updateStudent(id: number, updatedStudent: Student): Observable<Student> {
    return this.http.put<Student>(`${this.apiUrl}/${id}`, updatedStudent).pipe(
      tap(updated => {
        const currentStudents = this.studentsSubject.value;
        const index = currentStudents.findIndex(s => s.id === id);
        if (index !== -1) {
          const newStudents = [...currentStudents];
          newStudents[index] = updated;
          this.studentsSubject.next(newStudents);
        }
      }),
      catchError(error => {
        console.error('Error updating student', error);
        throw error;
      })
    );
  }

  // Delete student
  deleteStudent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const currentStudents = this.studentsSubject.value;
        const filtered = currentStudents.filter(s => s.id !== id);
        this.studentsSubject.next(filtered);
      }),
      catchError(error => {
        console.error('Error deleting student', error);
        throw error;
      })
    );
  }

  // Get all unique tech stacks
  getAllTechStacks(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/tech-stacks/unique`).pipe(
      catchError(error => {
        console.error('Error fetching tech stacks', error);
        return of([]);
      })
    );
  }

  // Filter students by tech stacks
  filterStudentsByTechStacks(selectedTechStacks: string[]): Observable<Student[]> {
    if (selectedTechStacks.length === 0) {
      return this.getAllStudents();
    }
    
    return this.http.post<Student[]>(`${this.apiUrl}/filter/tech-stacks`, selectedTechStacks).pipe(
      catchError(error => {
        console.error('Error filtering students', error);
        return of([]);
      })
    );
  }

  // Search students
  searchStudents(keyword: string): Observable<Student[]> {
    return this.http.get<Student[]>(`${this.apiUrl}/search?keyword=${keyword}`).pipe(
      catchError(error => {
        console.error('Error searching students', error);
        return of([]);
      })
    );
  }

  uploadExcel(file: File): Observable<Student[]> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<Student[]>(`${this.apiUrl}/upload`, formData).pipe(
      tap(newStudents => {
        const currentStudents = this.studentsSubject.value;
        this.studentsSubject.next([...currentStudents, ...newStudents]);
      }),
      catchError(error => {
        console.error('Error uploading excel file', error);
        throw error;
      })
    );
  }
}
