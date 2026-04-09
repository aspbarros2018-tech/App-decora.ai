-- Enable RLS on all public tables
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_annotations ENABLE ROW LEVEL SECURITY;

-- Flashcards policies
CREATE POLICY "Allow read access for authenticated users" ON public.flashcards
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access for admin" ON public.flashcards
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'email' = 'aspbarros2018@gmail.com')
    WITH CHECK (auth.jwt() ->> 'email' = 'aspbarros2018@gmail.com');

-- Materials policies
CREATE POLICY "Allow read access for authenticated users" ON public.materials
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access for admin" ON public.materials
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'email' = 'aspbarros2018@gmail.com')
    WITH CHECK (auth.jwt() ->> 'email' = 'aspbarros2018@gmail.com');

-- User Progress policies
CREATE POLICY "Users can view their own progress" ON public.user_progress
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON public.user_progress
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON public.user_progress
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress" ON public.user_progress
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Admin can read all profiles
CREATE POLICY "Admin can view all profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.jwt() ->> 'email' = 'aspbarros2018@gmail.com');

-- PDF Annotations policies
CREATE POLICY "Users can view their own annotations" ON public.pdf_annotations
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own annotations" ON public.pdf_annotations
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own annotations" ON public.pdf_annotations
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own annotations" ON public.pdf_annotations
    FOR DELETE TO authenticated USING (auth.uid() = user_id);
