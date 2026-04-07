from setuptools import setup, find_packages

setup(
    name="menu-translator-nci",
    version="1.0.0",
    description="Multilingual restaurant menu domain library: menu item management, language pack registry, and localised price formatting",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="Gangavarpu Karthik",
    author_email="x25160052@student.ncirl.ie",
    url="https://github.com/karthikgangavarapu/cpp_project",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[],
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Natural Language :: English",
    ],
)
