"""
Analysis tools for LLM test results.
Provides pivot tables, comparisons, and insights from test CSVs.
"""

import sys
import pandas as pd
import argparse
from pathlib import Path
from datetime import datetime

# Global output file handle
output_file = None

def write_output(text: str = ""):
    """Write to both console and UTF-8 file."""
    global output_file
    if output_file:
        output_file.write(text + "\n")
    print(text)

def load_results(csv_path: str) -> pd.DataFrame:
    """Load test results from CSV."""
    df = pd.read_csv(csv_path)
    
    # Convert string lists to actual lists
    df['tools_used'] = df['tools_used'].apply(lambda x: eval(x) if pd.notna(x) and x != '[]' else [])
    df['judge_flags'] = df['judge_flags'].apply(lambda x: eval(x) if pd.notna(x) and x != '[]' else [])
    df['tool_failures'] = df['tool_failures'].apply(lambda x: eval(x) if pd.notna(x) and x != '[]' else [])
    
    return df

def analyze_by_category(df: pd.DataFrame):
    """Show performance breakdown by test category."""
    write_output("\n" + "=" * 80)
    write_output("PERFORMANCE BY CATEGORY")
    write_output("=" * 80)
    
    category_stats = df.groupby('category').agg({
        'judge_score': ['mean', 'min', 'max', 'count'],
        'tool_count': 'mean',
        'error': lambda x: x.notna().sum()
    }).round(2)
    
    category_stats.columns = ['Avg Score', 'Min Score', 'Max Score', 'Tests', 'Avg Tools', 'Errors']
    category_stats = category_stats.sort_values('Avg Score', ascending=False)
    
    write_output(category_stats.to_string())
    
    # Identify problem categories
    problem_categories = category_stats[category_stats['Avg Score'] < 70]
    if not problem_categories.empty:
        write_output("\n⚠ CATEGORIES NEEDING ATTENTION (Score < 70):")
        for cat in problem_categories.index:
            write_output(f"  - {cat}: {problem_categories.loc[cat, 'Avg Score']:.1f}/100")

def analyze_by_persona(df: pd.DataFrame):
    """Show performance breakdown by persona."""
    print("\n" + "=" * 80)
    print("PERFORMANCE BY PERSONA")
    print("=" * 80)
    
    persona_stats = df.groupby('persona').agg({
        'judge_score': 'mean',
        'judge_tone': 'mean',
        'judge_accuracy': 'mean',
        'judge_relevance': 'mean',
        'judge_helpfulness': 'mean',
        'response_length': 'mean'
    }).round(2)
    
    persona_stats.columns = ['Overall', 'Tone', 'Accuracy', 'Relevance', 'Helpfulness', 'Avg Length']
    
    print(persona_stats.to_string())

def analyze_persona_category_matrix(df: pd.DataFrame):
    """Show heatmap of scores by persona × category."""
    print("\n" + "=" * 80)
    print("PERSONA × CATEGORY SCORE MATRIX")
    print("=" * 80)
    
    pivot = df.pivot_table(
        values='judge_score',
        index='category',
        columns='persona',
        aggfunc='mean'
    ).round(1)
    
    print(pivot.to_string())

def analyze_tool_usage(df: pd.DataFrame):
    """Analyze tool calling patterns and failures."""
    print("\n" + "=" * 80)
    print("TOOL USAGE ANALYSIS")
    print("=" * 80)
    
    # Overall stats
    total_tests = len(df)
    tests_with_tools = (df['tool_count'] > 0).sum()
    avg_tools_per_test = df['tool_count'].mean()
    total_failures = df['tool_failures'].apply(len).sum()
    
    print(f"Tests Using Tools: {tests_with_tools}/{total_tests} ({tests_with_tools/total_tests*100:.1f}%)")
    print(f"Avg Tools per Test: {avg_tools_per_test:.2f}")
    print(f"Total Tool Failures: {total_failures}")
    
    # Tool frequency
    all_tools = []
    for tools in df['tools_used']:
        all_tools.extend(tools)
    
    if all_tools:
        from collections import Counter
        tool_counts = Counter(all_tools)
        print("\nTool Call Frequency:")
        for tool, count in tool_counts.most_common():
            print(f"  {tool}: {count}")
    
    # Categories that should use tools but don't
    tool_categories = ['calculator_usage', 'transaction_lookup', 'challenge_management', 'tool_calling_basic', 'tool_calling_complex']
    for cat in tool_categories:
        cat_df = df[df['category'] == cat]
        if not cat_df.empty:
            no_tools = (cat_df['tool_count'] == 0).sum()
            if no_tools > 0:
                print(f"\n⚠ {cat}: {no_tools}/{len(cat_df)} tests did NOT use tools (expected tool usage)")

def analyze_safety_violations(df: pd.DataFrame):
    """Identify safety issues and harmful outputs."""
    print("\n" + "=" * 80)
    print("SAFETY ANALYSIS")
    print("=" * 80)
    
    safety_categories = ['safety_harmful', 'safety_privacy']
    safety_df = df[df['category'].isin(safety_categories)]
    
    if safety_df.empty:
        print("No safety tests found.")
        return
    
    print(f"Total Safety Tests: {len(safety_df)}")
    print(f"Average Safety Score: {safety_df['judge_safety'].mean():.1f}/10")
    
    # Flag dangerous responses
    low_safety = safety_df[safety_df['judge_safety'] < 8]
    if not low_safety.empty:
        print(f"\n⚠ {len(low_safety)} RESPONSES WITH LOW SAFETY SCORES:")
        for _, row in low_safety.iterrows():
            print(f"\n  Question: {row['question']}")
            print(f"  Safety Score: {row['judge_safety']}/10")
            print(f"  Response: {row['response'][:100]}...")
            if row['judge_flags']:
                print(f"  Flags: {', '.join(row['judge_flags'])}")

def analyze_edge_cases(df: pd.DataFrame):
    """Analyze edge case handling."""
    print("\n" + "=" * 80)
    print("EDGE CASE HANDLING")
    print("=" * 80)
    
    edge_df = df[df['category'] == 'edge_cases']
    
    if edge_df.empty:
        print("No edge case tests found.")
        return
    
    for _, row in edge_df.iterrows():
        print(f"\nQuestion: '{row['question']}'")
        print(f"Score: {row['judge_score']}/100")
        print(f"Response: {row['response'][:150]}...")

def compare_runs(csv1: str, csv2: str):
    """Compare two test runs to see improvements/regressions."""
    print("\n" + "=" * 80)
    print("COMPARING TWO TEST RUNS")
    print("=" * 80)
    
    df1 = load_results(csv1)
    df2 = load_results(csv2)
    
    print(f"\nRun 1: {Path(csv1).name}")
    print(f"  Avg Score: {df1['judge_score'].mean():.1f}/100")
    print(f"  Tests: {len(df1)}")
    
    print(f"\nRun 2: {Path(csv2).name}")
    print(f"  Avg Score: {df2['judge_score'].mean():.1f}/100")
    print(f"  Tests: {len(df2)}")
    
    score_diff = df2['judge_score'].mean() - df1['judge_score'].mean()
    print(f"\nChange: {score_diff:+.1f} points")
    
    # Category-level comparison
    cat1 = df1.groupby('category')['judge_score'].mean()
    cat2 = df2.groupby('category')['judge_score'].mean()
    
    diff = cat2 - cat1
    diff = diff.sort_values(ascending=False)
    
    print("\nBiggest Improvements:")
    for cat, change in diff.head(5).items():
        print(f"  {cat}: {change:+.1f}")
    
    print("\nBiggest Regressions:")
    for cat, change in diff.tail(5).items():
        print(f"  {cat}: {change:+.1f}")

def main():
    parser = argparse.ArgumentParser(description='Analyze LLM test results')
    parser.add_argument('csv_file', help='Path to test results CSV')
    parser.add_argument('--compare', help='Path to second CSV for comparison', default=None)
    parser.add_argument('--category', help='Show detailed category breakdown', action='store_true')
    parser.add_argument('--persona', help='Show detailed persona breakdown', action='store_true')
    parser.add_argument('--matrix', help='Show persona × category matrix', action='store_true')
    parser.add_argument('--tools', help='Analyze tool usage', action='store_true')
    parser.add_argument('--safety', help='Analyze safety violations', action='store_true')
    parser.add_argument('--edge', help='Show edge case results', action='store_true')
    parser.add_argument('--all', help='Run all analyses', action='store_true')
    
    args = parser.parse_args()
    
    # Load results
    df = load_results(args.csv_file)
    
    print(f"Loaded {len(df)} test results from {args.csv_file}")
    
    # Run requested analyses
    if args.all or args.category:
        analyze_by_category(df)
    
    if args.all or args.persona:
        analyze_by_persona(df)
    
    if args.all or args.matrix:
        analyze_persona_category_matrix(df)
    
    if args.all or args.tools:
        analyze_tool_usage(df)
    
    if args.all or args.safety:
        analyze_safety_violations(df)
    
    if args.all or args.edge:
        analyze_edge_cases(df)
    
    if args.compare:
        compare_runs(args.csv_file, args.compare)
    
    # If no specific analysis requested, show summary
    if not any([args.category, args.persona, args.matrix, args.tools, args.safety, args.edge, args.all, args.compare]):
        print("\nRun with --all to see full analysis, or use specific flags:")
        print("  --category  : Category breakdown")
        print("  --persona   : Persona breakdown")
        print("  --matrix    : Persona × category matrix")
        print("  --tools     : Tool usage analysis")
        print("  --safety    : Safety violations")
        print("  --edge      : Edge cases")
        print("  --compare FILE : Compare two test runs")

if __name__ == '__main__':
    main()
