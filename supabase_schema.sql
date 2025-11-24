-- Schema dla Supabase PostgreSQL
-- Capacity Team Planner Database Structure

-- Tabela przypisań FTE
CREATE TABLE IF NOT EXISTS fte_assignments (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    user_display_name VARCHAR(255) NOT NULL,
    project_key VARCHAR(50) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    assignment_date DATE NOT NULL,
    fte_value DECIMAL(3,2) NOT NULL CHECK (fte_value >= 0 AND fte_value <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unikalność: jeden użytkownik, jeden projekt, jedna data
    UNIQUE(user_email, project_key, assignment_date)
);

-- Indeksy dla lepszej wydajności
CREATE INDEX IF NOT EXISTS idx_fte_user_email ON fte_assignments(user_email);
CREATE INDEX IF NOT EXISTS idx_fte_project_key ON fte_assignments(project_key);
CREATE INDEX IF NOT EXISTS idx_fte_assignment_date ON fte_assignments(assignment_date);
CREATE INDEX IF NOT EXISTS idx_fte_user_project_date ON fte_assignments(user_email, project_key, assignment_date);

-- Funkcja do automatycznej aktualizacji updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger do automatycznej aktualizacji updated_at
CREATE TRIGGER update_fte_assignments_updated_at 
    BEFORE UPDATE ON fte_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Widok do łatwego przeglądania przypisań z agregacjami
CREATE OR REPLACE VIEW fte_assignments_summary AS
SELECT 
    user_email,
    user_display_name,
    project_key,
    project_name,
    MIN(assignment_date) as first_date,
    MAX(assignment_date) as last_date,
    COUNT(*) as total_days,
    AVG(fte_value) as avg_fte,
    SUM(fte_value * 8) as total_capacity_hours
FROM fte_assignments
GROUP BY user_email, user_display_name, project_key, project_name;

-- Widok do wykrywania przeciążeń
CREATE OR REPLACE VIEW fte_overload_detection AS
SELECT 
    user_email,
    user_display_name,
    assignment_date,
    SUM(fte_value) as total_fte,
    CASE 
        WHEN SUM(fte_value) > 1.0 THEN 'overloaded'
        WHEN SUM(fte_value) < 0.8 AND SUM(fte_value) > 0 THEN 'underutilized'
        ELSE 'optimal'
    END as status
FROM fte_assignments
GROUP BY user_email, user_display_name, assignment_date
HAVING SUM(fte_value) > 1.0 OR (SUM(fte_value) < 0.8 AND SUM(fte_value) > 0);

-- Komentarze do tabel
COMMENT ON TABLE fte_assignments IS 'Przypisania FTE (Full-Time Equivalent) użytkowników do projektów';
COMMENT ON COLUMN fte_assignments.fte_value IS 'Wartość FTE od 0.0 do 1.0 (np. 0.5 = 50% czasu)';
COMMENT ON COLUMN fte_assignments.assignment_date IS 'Data przypisania FTE';

-- Przykładowe dane (opcjonalne - można usunąć)
-- INSERT INTO fte_assignments (user_email, user_display_name, project_key, project_name, assignment_date, fte_value)
-- VALUES 
--     ('user@example.com', 'Jan Kowalski', 'PROJ1', 'Projekt 1', '2024-11-24', 0.5),
--     ('user@example.com', 'Jan Kowalski', 'PROJ2', 'Projekt 2', '2024-11-24', 0.5);

